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
import {
  ensureAuthenticated,
  getAuthSnapshot,
  updateCurrentUserPhoneNumber,
  updateCurrentUserProfile,
} from "../../services/auth";
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
import { uploadImageAsset } from "../../services/asset-service";
import {
  createOrUpdateClub,
  fetchOwnedClubs,
  listOwnedClubs,
} from "../../services/club-service";
import {
  createVenue,
  createVenueCourt,
  deactivateVenueCourt,
  fetchVenuesForOwner,
  listVenues,
  listVenuesForManagement,
  updateVenue,
  updateVenueCourt,
} from "../../services/venue-service";
import type {
  OwnerOption,
  OwnerType,
  UserGender,
  VenueStatus,
  VenueWithCourts,
} from "../../types/activity";
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
  key: OwnerType;
  title: string;
  meta: string;
  tag: string;
  statusText: string;
};

type ProfileSheetForm = {
  avatarInitial: string;
  avatarUrl: string;
  nickname: string;
  selectedGenderIndex: number;
  phoneMasked: string;
  phoneVerified: boolean;
};

type ClubSheetForm = {
  clubId: string;
  coverUrl: string;
  logoUrl: string;
  name: string;
  province: string;
  city: string;
  district: string;
  address: string;
  latitude: string;
  longitude: string;
  locationName: string;
  contactName: string;
  contactPhone: string;
  description: string;
  wechatId: string;
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
  selectedRoleType: string;
  showRoleContent: boolean;
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
  showProfileSheet: boolean;
  profileSheetForm: ProfileSheetForm;
  showClubSheet: boolean;
  clubOwnerLabels: string[];
  selectedClubOwnerIndex: number;
  clubSheetForm: ClubSheetForm;
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

type ChooseAvatarEvent = WechatMiniprogram.BaseEvent<{
  avatarUrl?: string;
}>;

type PhoneNumberEvent = WechatMiniprogram.BaseEvent<{
  code?: string;
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

function maskPhoneNumber(phoneNumber: string): string {
  if (phoneNumber.length < 7) {
    return phoneNumber;
  }

  return `${phoneNumber.slice(0, 3)}****${phoneNumber.slice(-4)}`;
}

function getAvatarInitial(nickname: string): string {
  return nickname.trim().slice(0, 1) || "你";
}

function getEmptyClubSheetForm(): ClubSheetForm {
  return {
    clubId: "",
    coverUrl: "",
    logoUrl: "",
    name: "",
    province: "",
    city: "",
    district: "",
    address: "",
    latitude: "",
    longitude: "",
    locationName: "",
    contactName: "",
    contactPhone: "",
    description: "",
    wechatId: "",
  };
}

function buildClubSheetForm(clubId = ""): ClubSheetForm {
  const club = listOwnedClubs(CURRENT_USER_ID).find((item) => item.id === clubId);

  if (!club) {
    return getEmptyClubSheetForm();
  }

  return {
    clubId: club.id,
    coverUrl: club.coverUrl ?? "",
    logoUrl: club.logoUrl ?? "",
    name: club.name,
    province: club.province ?? "",
    city: club.city ?? "",
    district: club.district ?? "",
    address: club.address ?? "",
    latitude: club.latitude ? `${club.latitude}` : "",
    longitude: club.longitude ? `${club.longitude}` : "",
    locationName: club.name,
    contactName: club.contactName ?? "",
    contactPhone: club.contactPhone ?? "",
    description: club.description ?? "",
    wechatId: club.wechatId ?? "",
  };
}

function getClubRoleStatus(ownerOptions: OwnerOption[]): {
  statusText: string;
  title: string;
  meta: string;
} {
  const clubOptions = ownerOptions.filter((item) => item.ownerType === "CLUB");

  if (clubOptions.length === 0) {
    return {
      statusText: "待创建",
      title: "俱乐部",
      meta: "还没有可发布的俱乐部主体，点击后可创建。",
    };
  }

  const club = listOwnedClubs(CURRENT_USER_ID).find((item) => item.id === clubOptions[0]?.ownerId);

  if (!club?.contactPhone) {
    return {
      statusText: "待补手机号",
      title: club?.name || "俱乐部",
      meta: "补齐俱乐部联系人手机号后，才可用俱乐部身份发布。",
    };
  }

  if (!club.contactName || !club.address) {
    return {
      statusText: "待完善",
      title: club.name,
      meta: "补齐俱乐部信息后，即可作为发布主体使用。",
    };
  }

  return {
    statusText: "可发布",
    title: club.name,
    meta: clubOptions.length > 1 ? "点击可切换俱乐部主体。" : "将展示俱乐部联系人手机号。",
  };
}

function buildRoleCards(ownerOptions: OwnerOption[]): OwnerCardItem[] {
  const currentUser = getCurrentUser();
  const authSnapshot = getAuthSnapshot();
  const personalReady = Boolean(
    currentUser?.baseProfileComplete && authSnapshot.contactProfileComplete
  );
  const clubRole = getClubRoleStatus(ownerOptions);

  return [
    {
      key: "PERSONAL",
      title: currentUser?.nickname || "个人",
      meta: personalReady ? "将展示你已验证的手机号。" : "先补齐资料和手机号，再继续创建。",
      tag: "个人",
      statusText: personalReady ? "可发布" : authSnapshot.baseProfileComplete ? "待补手机号" : "待完善",
    },
    {
      key: "CLUB",
      title: clubRole.title,
      meta: clubRole.meta,
      tag: "俱乐部",
      statusText: clubRole.statusText,
    },
  ];
}

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
    return "先选择个人或俱乐部角色，后续活动配置才会展开。";
  }

  if (ownerOption.ownerType === "PERSONAL") {
    return "个人发布时，将展示你已验证的手机号。";
  }

  return "俱乐部发布时，将展示俱乐部联系人手机号。";
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
    selectedOwnerIndex: -1,
    selectedRoleType: "",
    showRoleContent: false,
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
    showProfileSheet: false,
    profileSheetForm: {
      avatarInitial: "你",
      avatarUrl: "",
      nickname: "",
      selectedGenderIndex: 0,
      phoneMasked: "",
      phoneVerified: false,
    },
    showClubSheet: false,
    clubOwnerLabels: [],
    selectedClubOwnerIndex: 0,
    clubSheetForm: getEmptyClubSheetForm(),
  } as CreateActivityPageData,

  onLoad(options: Record<string, string | undefined>): void {
    this.syncPageChrome();
    void this.bootstrapPage(options);
  },

  onShow(): void {
    this.syncPageChrome();
    void this.syncRemoteOwnerAssets();
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

    const canContinue = await ensureAuthenticated();

    if (!canContinue) {
      return;
    }

    const sourceActivityId =
      typeof options.sourceActivityId === "string" && options.sourceActivityId.length > 0
        ? decodeURIComponent(options.sourceActivityId)
        : "";

    try {
      await fetchOwnedClubs(CURRENT_USER_ID);
    } catch {
      // Keep the local mock snapshot if the clubs API is not reachable yet.
    }

    this.hydratePage(sourceActivityId);
  },

  async syncRemoteOwnerAssets(): Promise<void> {
    try {
      await fetchOwnedClubs(CURRENT_USER_ID);
    } catch {
      // Keep the current local snapshot when the API is temporarily unavailable.
    }

    const ownerOptions = listOwnerOptions(CURRENT_USER_ID);
    const clubOptions = ownerOptions.filter((item) => item.ownerType === "CLUB");
    const currentSelectedOwnerId = this.data.ownerOptions[this.data.selectedOwnerIndex]?.ownerId ?? "";
    const nextSelectedOwnerIndex = ownerOptions.findIndex(
      (item) => item.ownerId === currentSelectedOwnerId
    );
    const selectedClubOwnerId =
      clubOptions[this.data.selectedClubOwnerIndex]?.ownerId ?? clubOptions[0]?.ownerId ?? "";
    const selectedClubOwnerIndex = Math.max(
      clubOptions.findIndex((item) => item.ownerId === selectedClubOwnerId),
      0
    );

    this.setData({
      ownerOptions,
      ownerCardItems: buildRoleCards(ownerOptions),
      clubOwnerLabels: clubOptions.map((item) => item.label),
      selectedClubOwnerIndex,
      selectedOwnerIndex: nextSelectedOwnerIndex >= 0 ? nextSelectedOwnerIndex : this.data.selectedOwnerIndex,
      ownerContactHint:
        nextSelectedOwnerIndex >= 0
          ? getOwnerContactHint(ownerOptions[nextSelectedOwnerIndex])
          : getOwnerContactHint(),
    });

    const selectedOwner =
      ownerOptions[nextSelectedOwnerIndex >= 0 ? nextSelectedOwnerIndex : this.data.selectedOwnerIndex];

    if (!selectedOwner) {
      return;
    }

    try {
      await fetchVenuesForOwner(selectedOwner.ownerType, selectedOwner.ownerId);
      this.refreshVenueData();
    } catch {
      // Leave the in-memory venue list untouched if remote sync fails.
    }
  },

  hydratePage(sourceActivityId = ""): void {
    const currentUser = getCurrentUser() ?? {
      id: CURRENT_USER_ID,
      nickname: "当前用户",
      gender: "MALE" as const,
      avatarColor: "#4C7CF0",
      phoneNumber: "",
      contactProfileComplete: false,
    };
    const ownerOptions = listOwnerOptions(CURRENT_USER_ID);
    const profileSnapshot = getAuthSnapshot();
    const clubOptions = ownerOptions.filter((item) => item.ownerType === "CLUB");
    const defaultClubOwnerIndex = Math.max(
      clubOptions.findIndex((item) => item.ownerId === listOwnedClubs(CURRENT_USER_ID)[0]?.id),
      0
    );

    if (sourceActivityId.length > 0) {
      try {
        const allVenues = listVenues();
        const mapped = mapDraftToCreateState(
          buildRepublishDraft(sourceActivityId, CURRENT_USER_ID),
          ownerOptions,
          allVenues
        );
        const selectedOwner = ownerOptions[mapped.selectedOwnerIndex];
        const selectedOwnerVenues = selectedOwner
          ? listVenues(selectedOwner.ownerType, selectedOwner.ownerId)
          : [];
        const selectedVenueId = selectedOwnerVenues[mapped.selectedVenueIndex]?.venue.id ?? "";
        const managerVenues = selectedOwner
          ? listVenuesForManagement(selectedOwner.ownerType, selectedOwner.ownerId)
          : [];
        const managerIndex = getVenueIndexById(managerVenues, selectedVenueId);

        this.setData({
          currentUserName: currentUser.nickname,
          ownerContactHint: getOwnerContactHint(selectedOwner),
          pageTitle: "再次发布",
          pageCaption: "已带出上次活动的配置，可直接修改后发布。",
          republishNotice:
            mapped.missingCourtLabels.length > 0
              ? `原活动有 ${mapped.missingCourtLabels.join("、")} 已停用，请重新确认场地选择。`
              : "",
          ownerOptions,
          ownerCardItems: buildRoleCards(ownerOptions),
          showRoleContent: true,
          selectedRoleType: selectedOwner?.ownerType ?? "",
          selectedSignupModeIndex: mapped.selectedSignupModeIndex,
          venues: selectedOwnerVenues,
          venueLabels: selectedOwnerVenues.map((item) => item.venue.name),
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
          profileSheetForm: {
            avatarInitial: getAvatarInitial(currentUser.nickname),
            avatarUrl: currentUser.avatarUrl ?? "",
            nickname: currentUser.nickname,
            selectedGenderIndex: currentUser.gender === "FEMALE" ? 1 : 0,
            phoneMasked: maskPhoneNumber(currentUser.phoneNumber ?? ""),
            phoneVerified: Boolean(profileSnapshot.contactProfileComplete),
          },
          clubOwnerLabels: clubOptions.map((item) => item.label),
          selectedClubOwnerIndex: defaultClubOwnerIndex,
          clubSheetForm: buildClubSheetForm(clubOptions[defaultClubOwnerIndex]?.ownerId ?? ""),
        });
        return;
      } catch (error) {
        this.showError(error);
      }
    }

    this.setData({
      currentUserName: currentUser.nickname,
      ownerContactHint: getOwnerContactHint(),
      pageTitle: "创建活动",
      pageCaption: "按单次活动创建，支持统一分配或自主选场。",
      republishNotice: "",
      ownerOptions,
      ownerCardItems: buildRoleCards(ownerOptions),
      selectedSignupModeIndex: 0,
      venues: [],
      venueLabels: [],
      selectedOwnerIndex: -1,
      selectedRoleType: "",
      showRoleContent: false,
      selectedChargeModeIndex: 1,
      selectedCancelCutoffIndex: 1,
      selectedVenueIndex: 0,
      availableCourts: [],
      createForm: getDefaultCreateForm(),
      descriptionBlocks: [createParagraphBlock()],
      managerVenues: [],
      managerVenueLabels: [],
      selectedManagerVenueIndex: 0,
      venueManagerForm: getEmptyVenueManagerForm(),
      managerCourts: buildManagerCourts(),
      profileSheetForm: {
        avatarInitial: getAvatarInitial(currentUser.nickname),
        avatarUrl: currentUser.avatarUrl ?? "",
        nickname: currentUser.nickname,
        selectedGenderIndex: currentUser.gender === "FEMALE" ? 1 : 0,
        phoneMasked: maskPhoneNumber(currentUser.phoneNumber ?? ""),
        phoneVerified: Boolean(profileSnapshot.contactProfileComplete),
      },
      clubOwnerLabels: clubOptions.map((item) => item.label),
      selectedClubOwnerIndex: defaultClubOwnerIndex,
      clubSheetForm: buildClubSheetForm(clubOptions[defaultClubOwnerIndex]?.ownerId ?? ""),
    });
  },

  refreshVenueData(savedVenueId = "", selectSavedVenue = false): void {
    const selectedOwner = this.data.ownerOptions[this.data.selectedOwnerIndex];

    if (!selectedOwner) {
      this.setData({
        venues: [],
        venueLabels: [],
        availableCourts: [],
        managerVenues: [],
        managerVenueLabels: [],
        showVenueManager: false,
      });
      return;
    }

    const previousSelectedVenueId = this.data.venues[this.data.selectedVenueIndex]?.venue.id ?? "";
    const venues = listVenues(selectedOwner.ownerType, selectedOwner.ownerId);
    const managerVenues = listVenuesForManagement(selectedOwner.ownerType, selectedOwner.ownerId);
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

  async pickAndUploadImage(scene: "activity-cover" | "club-cover" | "club-logo"): Promise<string> {
    const filePath = await this.pickSingleImage();

    if (!filePath) {
      return "";
    }

    const uploaded = await uploadImageAsset(filePath, scene);

    return uploaded.assetUrl;
  },

  activateRole(roleType: OwnerType): void {
    const nextOwnerIndex =
      roleType === "PERSONAL"
        ? this.data.ownerOptions.findIndex((item) => item.ownerType === "PERSONAL")
        : this.data.ownerOptions.findIndex(
            (item, index) =>
              item.ownerType === "CLUB" &&
              index ===
                this.data.ownerOptions.findIndex(
                  (candidate) =>
                    candidate.ownerType === "CLUB" &&
                    candidate.ownerId ===
                      this.data.ownerOptions.filter((candidate) => candidate.ownerType === "CLUB")[
                        this.data.selectedClubOwnerIndex
                      ]?.ownerId
                )
          );

    if (nextOwnerIndex < 0 || !this.data.ownerOptions[nextOwnerIndex]) {
      return;
    }

    this.setData({
      selectedOwnerIndex: nextOwnerIndex,
      selectedRoleType: roleType,
      showRoleContent: true,
      ownerContactHint: getOwnerContactHint(this.data.ownerOptions[nextOwnerIndex]),
      ownerCardItems: buildRoleCards(this.data.ownerOptions),
    });

    this.refreshVenueData();
  },

  handleProfileNicknameInput(event: InputEvent): void {
    const nickname = typeof event.detail.value === "string" ? event.detail.value.trim() : "";

    this.setData({
      "profileSheetForm.avatarInitial": getAvatarInitial(nickname),
      "profileSheetForm.nickname": nickname,
    } as never);
  },

  handleProfileChooseAvatar(event: ChooseAvatarEvent): void {
    const avatarUrl = typeof event.detail.avatarUrl === "string" ? event.detail.avatarUrl : "";

    this.setData({
      "profileSheetForm.avatarUrl": avatarUrl,
    } as never);
  },

  handleProfileGenderChange(event: PickerChangeEvent): void {
    this.setData({
      "profileSheetForm.selectedGenderIndex": Number(event.detail.value ?? 0),
    } as never);
  },

  async handleGetPhoneNumber(event: PhoneNumberEvent): Promise<void> {
    const code = typeof event.detail.code === "string" ? event.detail.code : "";

    if (!code || code === "getPhoneNumber:fail user deny") {
      wx.showToast({
        title: "你还没有完成手机号验证",
        icon: "none",
      });
      return;
    }

    try {
      const updatedUser = await updateCurrentUserPhoneNumber(code);

      this.setData({
        "profileSheetForm.phoneMasked": maskPhoneNumber(updatedUser?.phoneNumber ?? ""),
        "profileSheetForm.phoneVerified": Boolean(updatedUser?.contactProfileComplete),
      } as never);
    } catch (error) {
      this.showError(error);
    }
  },

  async handleSubmitProfileSheet(): Promise<void> {
    if (!this.data.profileSheetForm.nickname.trim()) {
      wx.showToast({
        title: "请先填写昵称",
        icon: "none",
      });
      return;
    }

    if (!this.data.profileSheetForm.phoneVerified) {
      wx.showToast({
        title: "请先完成手机号验证",
        icon: "none",
      });
      return;
    }

    const gender: UserGender =
      this.data.profileSheetForm.selectedGenderIndex === 1 ? "FEMALE" : "MALE";

    try {
      await updateCurrentUserProfile({
        avatarUrl: this.data.profileSheetForm.avatarUrl,
        nickname: this.data.profileSheetForm.nickname,
        gender,
      });

      this.setData({
        currentUserName: this.data.profileSheetForm.nickname,
        ownerOptions: listOwnerOptions(CURRENT_USER_ID),
        ownerCardItems: buildRoleCards(listOwnerOptions(CURRENT_USER_ID)),
        showProfileSheet: false,
      });
      this.activateRole("PERSONAL");
    } catch (error) {
      this.showError(error);
    }
  },

  handleCloseProfileSheet(): void {
    this.setData({
      showProfileSheet: false,
    });
  },

  handleClubOwnerChange(event: PickerChangeEvent): void {
    const selectedClubOwnerIndex = Number(event.detail.value ?? 0);
    const clubOwnerOptions = this.data.ownerOptions.filter((item) => item.ownerType === "CLUB");

    this.setData({
      selectedClubOwnerIndex,
      clubSheetForm: buildClubSheetForm(clubOwnerOptions[selectedClubOwnerIndex]?.ownerId ?? ""),
    });
  },

  handleClubInput(event: InputEvent & DatasetEvent): void {
    const field = event.currentTarget.dataset.field;
    const value = typeof event.detail.value === "string" ? event.detail.value : "";

    if (!field) {
      return;
    }

    this.setData({
      [`clubSheetForm.${field}`]: value,
    } as never);
  },

  handleChooseClubLocation(): void {
    compatibleWx.chooseLocation({
      success: (result: ChooseLocationSuccessResult) => {
        this.setData({
          "clubSheetForm.address": result.address || "",
          "clubSheetForm.latitude": `${result.latitude}`,
          "clubSheetForm.longitude": `${result.longitude}`,
          "clubSheetForm.locationName": result.name || "",
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

  async handleUploadClubCover(): Promise<void> {
    try {
      const assetUrl = await this.pickAndUploadImage("club-cover");

      if (!assetUrl) {
        return;
      }

      this.setData({
        "clubSheetForm.coverUrl": assetUrl,
      } as never);
    } catch (error) {
      this.showError(error);
    }
  },

  async handleUploadClubLogo(): Promise<void> {
    try {
      const assetUrl = await this.pickAndUploadImage("club-logo");

      if (!assetUrl) {
        return;
      }

      this.setData({
        "clubSheetForm.logoUrl": assetUrl,
      } as never);
    } catch (error) {
      this.showError(error);
    }
  },

  handleCloseClubSheet(): void {
    this.setData({
      showClubSheet: false,
    });
  },

  handleOpenClubSheet(): void {
    const clubOwnerOptions = this.data.ownerOptions.filter((item) => item.ownerType === "CLUB");

    this.setData({
      showClubSheet: true,
      clubOwnerLabels: clubOwnerOptions.map((item) => item.label),
      clubSheetForm: buildClubSheetForm(clubOwnerOptions[this.data.selectedClubOwnerIndex]?.ownerId ?? ""),
    });
  },

  async handleSubmitClubSheet(): Promise<void> {
    try {
      const nextClub = await createOrUpdateClub({
        clubId: this.data.clubSheetForm.clubId || undefined,
        currentUserId: CURRENT_USER_ID,
        coverUrl: this.data.clubSheetForm.coverUrl,
        logoUrl: this.data.clubSheetForm.logoUrl,
        name: this.data.clubSheetForm.name,
        province: this.data.clubSheetForm.province,
        city: this.data.clubSheetForm.city,
        district: this.data.clubSheetForm.district,
        address: this.data.clubSheetForm.address,
        latitude: Number(this.data.clubSheetForm.latitude || "0") || undefined,
        longitude: Number(this.data.clubSheetForm.longitude || "0") || undefined,
        description: this.data.clubSheetForm.description,
        wechatId: this.data.clubSheetForm.wechatId,
        contactName: this.data.clubSheetForm.contactName,
        contactPhone: this.data.clubSheetForm.contactPhone,
      });

      const ownerOptions = listOwnerOptions(CURRENT_USER_ID);
      const clubOwnerOptions = ownerOptions.filter((item) => item.ownerType === "CLUB");
      const selectedClubOwnerIndex = Math.max(
        clubOwnerOptions.findIndex((item) => item.ownerId === nextClub.id),
        0
      );

      this.setData({
        ownerOptions,
        ownerCardItems: buildRoleCards(ownerOptions),
        clubOwnerLabels: clubOwnerOptions.map((item) => item.label),
        selectedClubOwnerIndex,
        clubSheetForm: buildClubSheetForm(nextClub.id),
        showClubSheet: false,
      });

      this.activateRole("CLUB");
    } catch (error) {
      this.showError(error);
    }
  },

  async handleUploadCover(): Promise<void> {
    try {
      const assetUrl = await this.pickAndUploadImage("activity-cover");

      if (!assetUrl) {
        return;
      }

      this.setData({
        "createForm.coverUrl": assetUrl,
      } as never);
    } catch (error) {
      this.showError(error);
    }
  },

  handleBack(): void {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
      return;
    }

    wx.switchTab({
      url: "/pages/home/index",
    });
  },

  handleOwnerSelect(event: DatasetEvent): void {
    const roleType = event.currentTarget.dataset.field;

    if (roleType === "PERSONAL") {
      const authSnapshot = getAuthSnapshot();

      if (!authSnapshot.baseProfileComplete || !authSnapshot.contactProfileComplete) {
        this.setData({
          showProfileSheet: true,
        });
        return;
      }

      this.activateRole("PERSONAL");
      return;
    }

    if (roleType === "CLUB") {
      const clubOptions = this.data.ownerOptions.filter((item) => item.ownerType === "CLUB");
      const ownedClub = listOwnedClubs(CURRENT_USER_ID).find(
        (item) => item.id === clubOptions[this.data.selectedClubOwnerIndex]?.ownerId
      );

      if (!ownedClub || !ownedClub.contactPhone || !ownedClub.address || !ownedClub.contactName) {
        wx.navigateTo({
          url: `/pages/club-register/index?source=activity-create${
            ownedClub?.id ? `&clubId=${encodeURIComponent(ownedClub.id)}` : ""
          }`,
        });
        return;
      }

      this.activateRole("CLUB");
    }
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
    const venues = this.data.venues;

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
    const selectedOwner = this.data.ownerOptions[this.data.selectedOwnerIndex];

    if (!selectedOwner) {
      wx.showToast({
        title: "请先选择发布角色",
        icon: "none",
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/venue-court-management/index?source=activity-create&ownerType=${encodeURIComponent(
        selectedOwner.ownerType
      )}&ownerId=${encodeURIComponent(selectedOwner.ownerId)}`,
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
      throw new Error("请先地图选点，回填地址信息");
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

  async handleSaveVenueManager(): Promise<void> {
    try {
      const { activeCourts, latitude, longitude } = this.validateVenueManager();
      const { venueManagerForm, managerCourts } = this.data;
      const selectedOwner = this.data.ownerOptions[this.data.selectedOwnerIndex];

      if (!selectedOwner) {
        throw new Error("请先选择发布角色");
      }

      if (venueManagerForm.isNew) {
        const createdVenue = await createVenue({
          ownerType: selectedOwner.ownerType,
          ownerId: selectedOwner.ownerId,
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

        for (const court of activeCourts) {
          const createdCourt = createdCourtsByCode.get(court.courtCode.trim());

          if (
            createdCourt &&
            court.courtName.trim().length > 0 &&
            court.courtName.trim() !== createdCourt.courtName
          ) {
            await updateVenueCourt({
              courtId: createdCourt.id,
              courtCode: court.courtCode.trim(),
              courtName: court.courtName.trim(),
            });
          }
        }

        this.refreshVenueData(createdVenue.venue.id, true);
        wx.showToast({
          title: "场馆已新增",
          icon: "success",
        });
        return;
      }

      await updateVenue({
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

      for (const court of managerCourts) {
        if (court.isNew) {
          if (court.status === "ACTIVE" && court.courtCode.trim()) {
            await createVenueCourt({
              venueId: venueManagerForm.venueId,
              courtCode: court.courtCode.trim(),
              courtName: court.courtName.trim(),
            });
          }
          continue;
        }

        if (court.originalStatus === "ACTIVE" && court.status === "INACTIVE") {
          await deactivateVenueCourt(court.id);
          continue;
        }

        if (court.status === "ACTIVE") {
          await updateVenueCourt({
            courtId: court.id,
            courtCode: court.courtCode.trim(),
            courtName: court.courtName.trim(),
          });
        }
      }

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
