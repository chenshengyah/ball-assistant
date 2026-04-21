import {
  CANCEL_CUTOFF_OPTIONS,
  CHARGE_MODE_OPTIONS,
  SIGNUP_MODE_OPTIONS,
} from "../../constants/activity";
import {
  buildRepublishDraft,
  createActivity,
  getCurrentUser,
  listOwnerOptions,
} from "../../services/activity-service";
import { requireCompleteProfile } from "../../services/auth";
import {
  buildCreateActivityInput,
  createImageBlock,
  createParagraphBlock,
  ensureDescriptionBlocks,
  getDefaultAvailableCourts,
  getDefaultCreateForm,
  mapDraftToCreateState,
  parseDescriptionRichtext,
  serializeDescriptionBlocks,
  type CreateForm,
  type DescriptionBlock,
  type FormCourt,
} from "../../services/activity-create-form";
import {
  createVenue,
  createVenueCourt,
  deactivateVenueCourt,
  listVenues,
  listVenuesForManagement,
  updateVenue,
  updateVenueCourt,
} from "../../services/venue-service";
import type { OwnerOption, VenueStatus, VenueWithCourts } from "../../types/activity";
import { getPageTopStyle } from "../../utils/chrome";

type VenueManagerForm = {
  venueId: string;
  isNew: boolean;
  name: string;
  shortName: string;
  province: string;
  city: string;
  district: string;
  address: string;
  latitude: string;
  longitude: string;
  locationName: string;
  navigationName: string;
};

type VenueManagerCourtForm = {
  rowKey: string;
  id: string;
  courtCode: string;
  courtName: string;
  status: VenueStatus;
  originalStatus: VenueStatus;
  isNew: boolean;
};

type OwnerCardItem = {
  title: string;
  meta: string;
  tag: string;
};

type CreateActivityPageData = {
  currentUserName: string;
  pageTopStyle: string;
  ownerContactHint: string;
  pageTitle: string;
  pageCaption: string;
  republishNotice: string;
  ownerOptions: OwnerOption[];
  ownerCardItems: OwnerCardItem[];
  selectedOwnerIndex: number;
  signupModeLabels: string[];
  selectedSignupModeIndex: number;
  chargeModeLabels: string[];
  selectedChargeModeIndex: number;
  cancelCutoffLabels: string[];
  selectedCancelCutoffIndex: number;
  venues: VenueWithCourts[];
  venueLabels: string[];
  selectedVenueIndex: number;
  availableCourts: FormCourt[];
  createForm: CreateForm;
  descriptionBlocks: DescriptionBlock[];
  showVenueManager: boolean;
  managerVenues: VenueWithCourts[];
  managerVenueLabels: string[];
  selectedManagerVenueIndex: number;
  venueManagerForm: VenueManagerForm;
  managerCourts: VenueManagerCourtForm[];
};

type InputEvent = WechatMiniprogram.BaseEvent<{
  value?: string;
}>;

type DatasetEvent = WechatMiniprogram.BaseEvent<{
  blockIndex?: number;
  courtIndex?: number;
  delta?: number;
  field?: string;
  ownerIndex?: number;
  signupModeIndex?: number;
}>;

type PickerChangeEvent = WechatMiniprogram.BaseEvent<{
  value?: string;
}>;

type ChooseMediaSuccessResult = {
  tempFiles?: Array<{
    tempFilePath?: string;
  }>;
};

type ChooseLocationSuccessResult = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

type MiniProgramLocationError = {
  errMsg?: string;
};

type CompatibleWx = WechatMiniprogram.Wx & {
  chooseMedia(options: {
    count: number;
    mediaType: string[];
    sizeType: string[];
    sourceType: string[];
    success(result: ChooseMediaSuccessResult): void;
    fail(error: MiniProgramLocationError): void;
  }): void;
  chooseLocation(options: {
    success(result: ChooseLocationSuccessResult): void;
    fail(error: MiniProgramLocationError): void;
  }): void;
};

const CURRENT_USER_ID = "user-current";
const compatibleWx = wx as CompatibleWx;

function createTempKey(): string {
  return `temp-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function getEmptyVenueManagerForm(): VenueManagerForm {
  return {
    venueId: "",
    isNew: true,
    name: "",
    shortName: "",
    province: "",
    city: "",
    district: "",
    address: "",
    latitude: "",
    longitude: "",
    locationName: "",
    navigationName: "",
  };
}

function buildVenueManagerForm(venueItem?: VenueWithCourts): VenueManagerForm {
  if (!venueItem) {
    return getEmptyVenueManagerForm();
  }

  return {
    venueId: venueItem.venue.id,
    isNew: false,
    name: venueItem.venue.name,
    shortName: venueItem.venue.shortName,
    province: venueItem.venue.province,
    city: venueItem.venue.city,
    district: venueItem.venue.district,
    address: venueItem.venue.address,
    latitude: `${venueItem.venue.latitude}`,
    longitude: `${venueItem.venue.longitude}`,
    locationName: venueItem.venue.navigationName || venueItem.venue.name,
    navigationName: venueItem.venue.navigationName,
  };
}

function buildManagerCourts(venueItem?: VenueWithCourts): VenueManagerCourtForm[] {
  if (!venueItem) {
    return [
      {
        rowKey: createTempKey(),
        id: "",
        courtCode: "",
        courtName: "",
        status: "ACTIVE",
        originalStatus: "ACTIVE",
        isNew: true,
      },
    ];
  }

  return venueItem.courts.map((court) => ({
    rowKey: court.id,
    id: court.id,
    courtCode: court.courtCode,
    courtName: court.courtName,
    status: court.status,
    originalStatus: court.status,
    isNew: false,
  }));
}

function getVenueIndexById(venues: VenueWithCourts[], venueId: string): number {
  const matchedIndex = venues.findIndex((item) => item.venue.id === venueId);

  return matchedIndex >= 0 ? matchedIndex : 0;
}

function mergeAvailableCourts(
  venueItem: VenueWithCourts | undefined,
  previousCourts: FormCourt[]
): FormCourt[] {
  if (!venueItem) {
    return [];
  }

  const previousMap = new Map(previousCourts.map((court) => [court.venueCourtId, court]));

  return venueItem.courts.map((court) => {
    const previousCourt = previousMap.get(court.id);

    if (!previousCourt) {
      return {
        venueCourtId: court.id,
        label: court.courtName,
        enabled: false,
        capacity: "4",
      };
    }

    return {
      ...previousCourt,
      label: court.courtName,
    };
  });
}

function getOwnerContactHint(ownerOption?: OwnerOption): string {
  if (!ownerOption) {
    return "请选择发布身份。";
  }

  if (ownerOption.ownerType === "PERSONAL") {
    return "个人发布时，请留下可联系到你的微信号，报名人会在活动详情中看到。";
  }

  return "俱乐部身份发布时，也会展示本次活动发起人的微信号，方便报名人联系。";
}

function buildOwnerCardItems(ownerOptions: OwnerOption[]): OwnerCardItem[] {
  return ownerOptions.map((option) => {
    const [firstPart, secondPart] = option.label.split(" · ");

    if (option.ownerType === "PERSONAL") {
      return {
        title: secondPart || firstPart,
        meta: "个人身份",
        tag: "个人",
      };
    }

    return {
      title: firstPart,
      meta: secondPart || "俱乐部身份",
      tag: "俱乐部",
    };
  });
}

Page({
  data: {
    currentUserName: "",
    pageTopStyle: "",
    ownerContactHint: "",
    pageTitle: "创建活动",
    pageCaption: "按单次活动创建，支持统一分配或自主选场。",
    republishNotice: "",
    ownerOptions: [],
    ownerCardItems: [],
    selectedOwnerIndex: 0,
    signupModeLabels: SIGNUP_MODE_OPTIONS.map((item) => item.label),
    selectedSignupModeIndex: 0,
    chargeModeLabels: CHARGE_MODE_OPTIONS.map((item) => item.label),
    selectedChargeModeIndex: 1,
    cancelCutoffLabels: CANCEL_CUTOFF_OPTIONS.map((item) => item.label),
    selectedCancelCutoffIndex: 1,
    venues: [],
    venueLabels: [],
    selectedVenueIndex: 0,
    availableCourts: [],
    createForm: getDefaultCreateForm(),
    descriptionBlocks: [createParagraphBlock()],
    showVenueManager: false,
    managerVenues: [],
    managerVenueLabels: [],
    selectedManagerVenueIndex: 0,
    venueManagerForm: getEmptyVenueManagerForm(),
    managerCourts: [],
  } as CreateActivityPageData,

  onLoad(options: Record<string, string | undefined>): void {
    this.syncPageChrome();
    void this.bootstrapPage(options);
  },

  onShow(): void {
    this.syncPageChrome();
  },

  syncPageChrome(): void {
    this.setData({
      pageTopStyle: getPageTopStyle(12),
    });
  },

  async bootstrapPage(options: Record<string, string | undefined>): Promise<void> {
    const shouldSkipAuth = options.debugSkipAuth === "1";

    if (shouldSkipAuth) {
      const sourceActivityId =
        typeof options.sourceActivityId === "string" && options.sourceActivityId.length > 0
          ? decodeURIComponent(options.sourceActivityId)
          : "";

      this.hydratePage(sourceActivityId);
      return;
    }

    const canContinue = await requireCompleteProfile({
      type: "CREATE_ACTIVITY",
    });

    if (!canContinue) {
      return;
    }

    const sourceActivityId =
      typeof options.sourceActivityId === "string" && options.sourceActivityId.length > 0
        ? decodeURIComponent(options.sourceActivityId)
        : "";

    this.hydratePage(sourceActivityId);
  },

  hydratePage(sourceActivityId = ""): void {
    const currentUser = getCurrentUser() ?? {
      id: CURRENT_USER_ID,
      nickname: "当前用户",
      gender: "MALE" as const,
      avatarColor: "#4C7CF0",
    };
    const ownerOptions = listOwnerOptions(CURRENT_USER_ID);
    const venues = listVenues();
    const managerVenues = listVenuesForManagement();

    if (sourceActivityId.length > 0) {
      try {
        const mapped = mapDraftToCreateState(
          buildRepublishDraft(sourceActivityId, CURRENT_USER_ID),
          ownerOptions,
          venues
        );
        const selectedVenueId = venues[mapped.selectedVenueIndex]?.venue.id ?? "";
        const managerIndex = getVenueIndexById(managerVenues, selectedVenueId);

        this.setData({
          currentUserName: currentUser.nickname,
          ownerContactHint: getOwnerContactHint(ownerOptions[mapped.selectedOwnerIndex]),
          pageTitle: "再次发布",
          pageCaption: "已带出上次活动的配置，可直接修改后发布。",
          republishNotice:
            mapped.missingCourtLabels.length > 0
              ? `原活动有 ${mapped.missingCourtLabels.join("、")} 已停用，请重新确认场地选择。`
              : "",
          ownerOptions,
          ownerCardItems: buildOwnerCardItems(ownerOptions),
          selectedSignupModeIndex: mapped.selectedSignupModeIndex,
          venues,
          venueLabels: venues.map((item) => item.venue.name),
          createForm: mapped.createForm,
          selectedOwnerIndex: mapped.selectedOwnerIndex,
          selectedChargeModeIndex: mapped.selectedChargeModeIndex,
          selectedCancelCutoffIndex: Math.max(
            CANCEL_CUTOFF_OPTIONS.findIndex(
              (item) =>
                item.value === Number(mapped.createForm.cancelCutoffMinutesBeforeStart || "60")
            ),
            0
          ),
          selectedVenueIndex: mapped.selectedVenueIndex,
          availableCourts: mapped.availableCourts,
          descriptionBlocks: ensureDescriptionBlocks(
            parseDescriptionRichtext(mapped.createForm.descriptionRichtext)
          ),
          managerVenues,
          managerVenueLabels: managerVenues.map((item) => item.venue.name),
          selectedManagerVenueIndex: managerIndex,
          venueManagerForm: buildVenueManagerForm(managerVenues[managerIndex]),
          managerCourts: buildManagerCourts(managerVenues[managerIndex]),
        });
        return;
      } catch (error) {
        this.showError(error);
      }
    }

    const managerIndex = getVenueIndexById(managerVenues, venues[0]?.venue.id ?? "");

    this.setData({
      currentUserName: currentUser.nickname,
      ownerContactHint: getOwnerContactHint(ownerOptions[0]),
      pageTitle: "创建活动",
      pageCaption: "按单次活动创建，支持统一分配或自主选场。",
      republishNotice: "",
      ownerOptions,
      ownerCardItems: buildOwnerCardItems(ownerOptions),
      selectedSignupModeIndex: 0,
      venues,
      venueLabels: venues.map((item) => item.venue.name),
      selectedOwnerIndex: 0,
      selectedChargeModeIndex: 1,
      selectedCancelCutoffIndex: 1,
      selectedVenueIndex: 0,
      availableCourts: getDefaultAvailableCourts(venues, 0),
      createForm: getDefaultCreateForm(),
      descriptionBlocks: [createParagraphBlock()],
      managerVenues,
      managerVenueLabels: managerVenues.map((item) => item.venue.name),
      selectedManagerVenueIndex: managerIndex,
      venueManagerForm: buildVenueManagerForm(managerVenues[managerIndex]),
      managerCourts: buildManagerCourts(managerVenues[managerIndex]),
    });
  },

  refreshVenueData(savedVenueId = "", selectSavedVenue = false): void {
    const previousSelectedVenueId = this.data.venues[this.data.selectedVenueIndex]?.venue.id ?? "";
    const venues = listVenues();
    const managerVenues = listVenuesForManagement();
    const nextSelectedVenueId =
      (selectSavedVenue ? savedVenueId : previousSelectedVenueId) ||
      venues[0]?.venue.id ||
      "";
    const nextSelectedVenueIndex = getVenueIndexById(venues, nextSelectedVenueId);
    const nextSelectedVenue = venues[nextSelectedVenueIndex];
    const shouldPreserveCourtConfig =
      previousSelectedVenueId.length > 0 &&
      previousSelectedVenueId === nextSelectedVenue?.venue.id &&
      !selectSavedVenue;
    const availableCourts = shouldPreserveCourtConfig
      ? mergeAvailableCourts(nextSelectedVenue, this.data.availableCourts)
      : getDefaultAvailableCourts(venues, nextSelectedVenueIndex);
    const managerIndex = getVenueIndexById(managerVenues, savedVenueId || nextSelectedVenueId);

    this.setData({
      venues,
      venueLabels: venues.map((item) => item.venue.name),
      selectedVenueIndex: nextSelectedVenueIndex,
      availableCourts,
      managerVenues,
      managerVenueLabels: managerVenues.map((item) => item.venue.name),
      selectedManagerVenueIndex: managerIndex,
      venueManagerForm: buildVenueManagerForm(managerVenues[managerIndex]),
      managerCourts: buildManagerCourts(managerVenues[managerIndex]),
      showVenueManager: false,
    });
  },

  updateDescriptionBlocks(blocks: DescriptionBlock[]): void {
    const nextBlocks = ensureDescriptionBlocks(blocks);

    this.setData({
      descriptionBlocks: nextBlocks,
      "createForm.descriptionRichtext": serializeDescriptionBlocks(nextBlocks),
    } as never);
  },

  async pickSingleImage(): Promise<string> {
    return new Promise((resolve, reject) => {
      compatibleWx.chooseMedia({
        count: 1,
        mediaType: ["image"],
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
        success: (result: ChooseMediaSuccessResult) => {
          const tempFilePath = result.tempFiles?.[0]?.tempFilePath ?? "";

          if (!tempFilePath) {
            reject(new Error("未获取到图片，请重试"));
            return;
          }

          resolve(tempFilePath);
        },
        fail: (error: MiniProgramLocationError) => {
          const errMsg = error.errMsg ?? "";

          if (errMsg.includes("cancel")) {
            resolve("");
            return;
          }

          reject(error);
        },
      });
    });
  },

  handleBack(): void {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
      return;
    }

    wx.switchTab({
      url: "/pages/activity/index",
    });
  },

  handleOwnerSelect(event: DatasetEvent): void {
    const selectedOwnerIndex = Number(event.currentTarget.dataset.ownerIndex);

    if (!Number.isFinite(selectedOwnerIndex) || !this.data.ownerOptions[selectedOwnerIndex]) {
      return;
    }

    this.setData({
      ownerContactHint: getOwnerContactHint(this.data.ownerOptions[selectedOwnerIndex]),
      selectedOwnerIndex,
    });
  },

  handleChargeModeChange(event: PickerChangeEvent): void {
    this.setData({
      selectedChargeModeIndex: Number(event.detail.value ?? 0),
    });
  },

  handleSignupModeSelect(event: DatasetEvent): void {
    const selectedSignupModeIndex = Number(event.currentTarget.dataset.signupModeIndex);
    const selectedOption = SIGNUP_MODE_OPTIONS[selectedSignupModeIndex];

    if (!Number.isFinite(selectedSignupModeIndex) || !selectedOption) {
      return;
    }

    this.setData({
      selectedSignupModeIndex,
      "createForm.signupMode": selectedOption.value,
    } as never);
  },

  handleVenueChange(event: PickerChangeEvent): void {
    const selectedVenueIndex = Number(event.detail.value ?? 0);
    const venues = listVenues();

    this.setData({
      venues,
      selectedVenueIndex,
      venueLabels: venues.map((item) => item.venue.name),
      availableCourts: getDefaultAvailableCourts(venues, selectedVenueIndex),
    });
  },

  handleCancelCutoffChange(event: PickerChangeEvent): void {
    const selectedCancelCutoffIndex = Number(event.detail.value ?? 0);
    const selectedOption = CANCEL_CUTOFF_OPTIONS[selectedCancelCutoffIndex];

    this.setData({
      selectedCancelCutoffIndex,
      "createForm.cancelCutoffMinutesBeforeStart": `${selectedOption?.value ?? 60}`,
    } as never);
  },

  handleCreateInput(event: InputEvent & DatasetEvent): void {
    const field = event.currentTarget.dataset.field;
    const value = typeof event.detail.value === "string" ? event.detail.value : "";

    if (!field) {
      return;
    }

    this.setData({
      [`createForm.${field}`]: value,
    } as never);
  },

  handleDescriptionBlockInput(event: InputEvent & DatasetEvent): void {
    const blockIndex = Number(event.currentTarget.dataset.blockIndex);
    const block = this.data.descriptionBlocks[blockIndex];

    if (!block || block.type !== "paragraph") {
      return;
    }

    const nextBlocks = this.data.descriptionBlocks.map((item, index) =>
      index === blockIndex && item.type === "paragraph"
        ? {
            ...item,
            text: typeof event.detail.value === "string" ? event.detail.value : "",
          }
        : item
    );

    this.updateDescriptionBlocks(nextBlocks);
  },

  handleAddParagraphBlock(): void {
    this.updateDescriptionBlocks([...this.data.descriptionBlocks, createParagraphBlock()]);
  },

  async handleAddImageBlock(): Promise<void> {
    try {
      const imagePath = await this.pickSingleImage();

      if (!imagePath) {
        return;
      }

      this.updateDescriptionBlocks([...this.data.descriptionBlocks, createImageBlock(imagePath)]);
    } catch (error) {
      this.showError(error);
    }
  },

  async handleReplaceImageBlock(event: DatasetEvent): Promise<void> {
    const blockIndex = Number(event.currentTarget.dataset.blockIndex);
    const block = this.data.descriptionBlocks[blockIndex];

    if (!block || block.type !== "image") {
      return;
    }

    try {
      const imagePath = await this.pickSingleImage();

      if (!imagePath) {
        return;
      }

      const nextBlocks = this.data.descriptionBlocks.map((item, index) =>
        index === blockIndex && item.type === "image"
          ? {
              ...item,
              src: imagePath,
            }
          : item
      );

      this.updateDescriptionBlocks(nextBlocks);
    } catch (error) {
      this.showError(error);
    }
  },

  handleMoveDescriptionBlock(event: DatasetEvent): void {
    const blockIndex = Number(event.currentTarget.dataset.blockIndex);
    const delta = Number(event.currentTarget.dataset.delta);
    const targetIndex = blockIndex + delta;

    if (
      !Number.isFinite(blockIndex) ||
      !Number.isFinite(delta) ||
      targetIndex < 0 ||
      targetIndex >= this.data.descriptionBlocks.length
    ) {
      return;
    }

    const nextBlocks = [...this.data.descriptionBlocks];
    const [movedBlock] = nextBlocks.splice(blockIndex, 1);

    if (!movedBlock) {
      return;
    }

    nextBlocks.splice(targetIndex, 0, movedBlock);
    this.updateDescriptionBlocks(nextBlocks);
  },

  handleDeleteDescriptionBlock(event: DatasetEvent): void {
    const blockIndex = Number(event.currentTarget.dataset.blockIndex);

    if (!Number.isFinite(blockIndex) || !this.data.descriptionBlocks[blockIndex]) {
      return;
    }

    this.updateDescriptionBlocks(
      this.data.descriptionBlocks.filter((_, index) => index !== blockIndex)
    );
  },

  handleToggleCourt(event: DatasetEvent): void {
    const courtIndex = Number(event.currentTarget.dataset.courtIndex);
    const court = this.data.availableCourts[courtIndex];

    if (!court) {
      return;
    }

    this.setData({
      [`availableCourts[${courtIndex}].enabled`]: !court.enabled,
    } as never);
  },

  handleCourtInput(event: InputEvent & DatasetEvent): void {
    const courtIndex = Number(event.currentTarget.dataset.courtIndex);
    const field = event.currentTarget.dataset.field;
    const value = typeof event.detail.value === "string" ? event.detail.value : "";

    if (!field) {
      return;
    }

    this.setData({
      [`availableCourts[${courtIndex}].${field}`]: value,
    } as never);
  },

  handleOpenVenueManager(): void {
    const managerVenues = listVenuesForManagement();
    const selectedVenueId = this.data.venues[this.data.selectedVenueIndex]?.venue.id ?? "";
    const managerIndex = getVenueIndexById(managerVenues, selectedVenueId);

    this.setData({
      showVenueManager: true,
      managerVenues,
      managerVenueLabels: managerVenues.map((item) => item.venue.name),
      selectedManagerVenueIndex: managerIndex,
      venueManagerForm: buildVenueManagerForm(managerVenues[managerIndex]),
      managerCourts: buildManagerCourts(managerVenues[managerIndex]),
    });
  },

  handleCloseVenueManager(): void {
    this.setData({
      showVenueManager: false,
    });
  },

  handleVenueSheetTap(): void {},

  handleManagerVenueChange(event: PickerChangeEvent): void {
    const selectedManagerVenueIndex = Number(event.detail.value ?? 0);
    const venueItem = this.data.managerVenues[selectedManagerVenueIndex];

    this.setData({
      selectedManagerVenueIndex,
      venueManagerForm: buildVenueManagerForm(venueItem),
      managerCourts: buildManagerCourts(venueItem),
    });
  },

  handleStartCreateVenue(): void {
    this.setData({
      venueManagerForm: getEmptyVenueManagerForm(),
      managerCourts: buildManagerCourts(),
    });
  },

  handleVenueManagerInput(event: InputEvent & DatasetEvent): void {
    const field = event.currentTarget.dataset.field;
    const value = typeof event.detail.value === "string" ? event.detail.value : "";

    if (!field) {
      return;
    }

    this.setData({
      [`venueManagerForm.${field}`]: value,
    } as never);
  },

  handleChooseVenueLocation(): void {
    compatibleWx.chooseLocation({
      success: (result: ChooseLocationSuccessResult) => {
        const locationName = result.name || "";
        const currentNavigationName = this.data.venueManagerForm.navigationName.trim();

        this.setData({
          "venueManagerForm.address": result.address || "",
          "venueManagerForm.latitude": `${result.latitude}`,
          "venueManagerForm.longitude": `${result.longitude}`,
          "venueManagerForm.locationName": locationName,
          "venueManagerForm.navigationName": currentNavigationName || locationName || this.data.venueManagerForm.name,
        } as never);
      },
      fail: (error: MiniProgramLocationError) => {
        const errMsg = error.errMsg ?? "";

        if (!errMsg.includes("cancel")) {
          this.showError(error);
        }
      },
    });
  },

  handleManagerCourtInput(event: InputEvent & DatasetEvent): void {
    const courtIndex = Number(event.currentTarget.dataset.courtIndex);
    const field = event.currentTarget.dataset.field;
    const value = typeof event.detail.value === "string" ? event.detail.value : "";

    if (!field) {
      return;
    }

    this.setData({
      [`managerCourts[${courtIndex}].${field}`]: value,
    } as never);
  },

  handleAddManagerCourt(): void {
    this.setData({
      managerCourts: [
        ...this.data.managerCourts,
        {
          rowKey: createTempKey(),
          id: "",
          courtCode: "",
          courtName: "",
          status: "ACTIVE",
          originalStatus: "ACTIVE",
          isNew: true,
        },
      ],
    });
  },

  handleToggleManagerCourtStatus(event: DatasetEvent): void {
    const courtIndex = Number(event.currentTarget.dataset.courtIndex);
    const court = this.data.managerCourts[courtIndex];

    if (!court) {
      return;
    }

    if (court.isNew) {
      this.setData({
        managerCourts: this.data.managerCourts.filter((_, index) => index !== courtIndex),
      });
      return;
    }

    if (court.status === "INACTIVE") {
      return;
    }

    this.setData({
      [`managerCourts[${courtIndex}].status`]: "INACTIVE",
    } as never);
  },

  validateVenueManager(): {
    activeCourts: VenueManagerCourtForm[];
    latitude: number;
    longitude: number;
  } {
    const { venueManagerForm, managerCourts } = this.data;

    if (!venueManagerForm.name.trim()) {
      throw new Error("请填写场馆名称");
    }

    if (!venueManagerForm.address.trim()) {
      throw new Error("请填写场馆地址");
    }

    const latitude = Number(venueManagerForm.latitude);
    const longitude = Number(venueManagerForm.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("请先地图选点，回填地址与经纬度");
    }

    const activeCourts = managerCourts.filter((court) => court.status === "ACTIVE");
    const activeCodes = new Set<string>();

    activeCourts.forEach((court) => {
      const courtCode = court.courtCode.trim();

      if (!courtCode) {
        throw new Error("请为启用中的场地填写场地号");
      }

      if (activeCodes.has(courtCode)) {
        throw new Error("场地号重复了，请检查后重试");
      }

      activeCodes.add(courtCode);
    });

    if (venueManagerForm.isNew && activeCourts.length === 0) {
      throw new Error("新建场馆时至少需要一片启用场地");
    }

    return {
      activeCourts,
      latitude,
      longitude,
    };
  },

  handleSaveVenueManager(): void {
    try {
      const { activeCourts, latitude, longitude } = this.validateVenueManager();
      const { venueManagerForm, managerCourts } = this.data;

      if (venueManagerForm.isNew) {
        const createdVenue = createVenue({
          name: venueManagerForm.name,
          shortName: venueManagerForm.shortName || venueManagerForm.name,
          province: venueManagerForm.province.trim(),
          city: venueManagerForm.city.trim(),
          district: venueManagerForm.district.trim(),
          address: venueManagerForm.address,
          latitude,
          longitude,
          navigationName: venueManagerForm.navigationName || venueManagerForm.name,
          courtCodes: activeCourts.map((court) => court.courtCode.trim()),
        });
        const createdCourtsByCode = new Map(
          createdVenue.courts.map((court) => [court.courtCode, court])
        );

        activeCourts.forEach((court) => {
          const createdCourt = createdCourtsByCode.get(court.courtCode.trim());

          if (
            createdCourt &&
            court.courtName.trim().length > 0 &&
            court.courtName.trim() !== createdCourt.courtName
          ) {
            updateVenueCourt({
              courtId: createdCourt.id,
              courtCode: court.courtCode.trim(),
              courtName: court.courtName.trim(),
            });
          }
        });

        this.refreshVenueData(createdVenue.venue.id, true);
        wx.showToast({
          title: "场馆已新增",
          icon: "success",
        });
        return;
      }

      updateVenue({
        venueId: venueManagerForm.venueId,
        name: venueManagerForm.name,
        shortName: venueManagerForm.shortName,
        province: venueManagerForm.province.trim(),
        city: venueManagerForm.city.trim(),
        district: venueManagerForm.district,
        address: venueManagerForm.address,
        latitude,
        longitude,
        navigationName: venueManagerForm.navigationName,
      });

      managerCourts.forEach((court) => {
        if (court.isNew) {
          if (court.status === "ACTIVE" && court.courtCode.trim()) {
            createVenueCourt({
              venueId: venueManagerForm.venueId,
              courtCode: court.courtCode.trim(),
              courtName: court.courtName.trim(),
            });
          }
          return;
        }

        if (court.originalStatus === "ACTIVE" && court.status === "INACTIVE") {
          deactivateVenueCourt(court.id);
          return;
        }

        if (court.status === "ACTIVE") {
          updateVenueCourt({
            courtId: court.id,
            courtCode: court.courtCode.trim(),
            courtName: court.courtName.trim(),
          });
        }
      });

      this.refreshVenueData(venueManagerForm.venueId, false);
      wx.showToast({
        title: "场馆配置已保存",
        icon: "success",
      });
    } catch (error) {
      this.showError(error);
    }
  },

  handleSubmitCreate(): void {
    try {
      const createForm = {
        ...this.data.createForm,
        descriptionRichtext: serializeDescriptionBlocks(this.data.descriptionBlocks),
      };
      const createdActivity = createActivity(
        buildCreateActivityInput({
          createForm,
          availableCourts: this.data.availableCourts,
          ownerOption: this.data.ownerOptions[this.data.selectedOwnerIndex],
          selectedVenue: this.data.venues[this.data.selectedVenueIndex],
          selectedChargeModeIndex: this.data.selectedChargeModeIndex,
          currentUserId: CURRENT_USER_ID,
        })
      );

      wx.showToast({
        title: createForm.sourceActivityId ? "已再次发布" : "活动已发布",
        icon: "success",
      });

      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/activity-detail/index?activityId=${encodeURIComponent(createdActivity.id)}`,
        });
      }, 500);
    } catch (error) {
      this.showError(error);
    }
  },

  showError(error: unknown): void {
    const title = error instanceof Error ? error.message : "操作失败，请稍后重试";

    wx.showToast({
      title,
      icon: "none",
    });
  },
});
