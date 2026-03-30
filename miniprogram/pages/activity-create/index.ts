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
  buildCreateActivityInput,
  getDefaultAvailableCourts,
  getDefaultCreateForm,
  mapDraftToCreateState,
  type CreateForm,
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

type VenueManagerForm = {
  venueId: string;
  isNew: boolean;
  name: string;
  shortName: string;
  district: string;
  address: string;
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

type CreateActivityPageData = {
  currentUserName: string;
  pageTitle: string;
  pageCaption: string;
  republishNotice: string;
  ownerOptions: OwnerOption[];
  ownerLabels: string[];
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
  courtIndex?: number;
  field?: string;
}>;

type PickerChangeEvent = WechatMiniprogram.BaseEvent<{
  value?: string;
}>;

const CURRENT_USER_ID = "user-current";

function createTempKey(): string {
  return `temp-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function getEmptyVenueManagerForm(): VenueManagerForm {
  return {
    venueId: "",
    isNew: true,
    name: "",
    shortName: "",
    district: "",
    address: "",
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
    district: venueItem.venue.district,
    address: venueItem.venue.address,
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

Page<CreateActivityPageData>({
  data: {
    currentUserName: "",
    pageTitle: "创建活动",
    pageCaption: "按单次活动创建，支持按场地报名或统一报名。",
    republishNotice: "",
    ownerOptions: [],
    ownerLabels: [],
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
    showVenueManager: false,
    managerVenues: [],
    managerVenueLabels: [],
    selectedManagerVenueIndex: 0,
    venueManagerForm: getEmptyVenueManagerForm(),
    managerCourts: [],
  },

  onLoad(options: Record<string, string | undefined>): void {
    const sourceActivityId =
      typeof options.sourceActivityId === "string" && options.sourceActivityId.length > 0
        ? decodeURIComponent(options.sourceActivityId)
        : "";

    this.hydratePage(sourceActivityId);
  },

  hydratePage(sourceActivityId = ""): void {
    const currentUser = getCurrentUser();
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
          pageTitle: "再次发布",
          pageCaption: "已带出上次活动的配置，可直接修改后发布。",
          republishNotice:
            mapped.missingCourtLabels.length > 0
              ? `原活动有 ${mapped.missingCourtLabels.join("、")} 已停用，请重新确认场地选择。`
              : "",
          ownerOptions,
          ownerLabels: ownerOptions.map((item) => item.label),
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
      pageTitle: "创建活动",
      pageCaption: "按单次活动创建，支持按场地报名或统一报名。",
      republishNotice: "",
      ownerOptions,
      ownerLabels: ownerOptions.map((item) => item.label),
      selectedSignupModeIndex: 0,
      venues,
      venueLabels: venues.map((item) => item.venue.name),
      selectedOwnerIndex: 0,
      selectedChargeModeIndex: 1,
      selectedCancelCutoffIndex: 1,
      selectedVenueIndex: 0,
      availableCourts: getDefaultAvailableCourts(venues, 0),
      createForm: getDefaultCreateForm(),
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

  handleBack(): void {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
      return;
    }

    wx.switchTab({
      url: "/pages/activity/index",
    });
  },

  handleOwnerChange(event: PickerChangeEvent): void {
    this.setData({
      selectedOwnerIndex: Number(event.detail.value ?? 0),
    });
  },

  handleChargeModeChange(event: PickerChangeEvent): void {
    this.setData({
      selectedChargeModeIndex: Number(event.detail.value ?? 0),
    });
  },

  handleSignupModeChange(event: PickerChangeEvent): void {
    const selectedSignupModeIndex = Number(event.detail.value ?? 0);
    const selectedOption = SIGNUP_MODE_OPTIONS[selectedSignupModeIndex];

    this.setData({
      selectedSignupModeIndex,
      "createForm.signupMode": selectedOption?.value ?? "USER_SELECT_COURT",
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

  handleDialogTap(): void {},

  validateVenueManager(): {
    activeCourts: VenueManagerCourtForm[];
  } {
    const { venueManagerForm, managerCourts } = this.data;

    if (!venueManagerForm.name.trim()) {
      throw new Error("请填写场馆名称");
    }

    if (!venueManagerForm.address.trim()) {
      throw new Error("请填写场馆地址");
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
    };
  },

  handleSaveVenueManager(): void {
    try {
      const { activeCourts } = this.validateVenueManager();
      const { venueManagerForm, managerCourts } = this.data;

      if (venueManagerForm.isNew) {
        const createdVenue = createVenue({
          name: venueManagerForm.name,
          shortName: venueManagerForm.shortName || venueManagerForm.name,
          province: "上海市",
          city: "上海市",
          district: venueManagerForm.district || "未填写区域",
          address: venueManagerForm.address,
          latitude: 0,
          longitude: 0,
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
        district: venueManagerForm.district,
        address: venueManagerForm.address,
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
      createActivity(
        buildCreateActivityInput({
          createForm: this.data.createForm,
          availableCourts: this.data.availableCourts,
          ownerOption: this.data.ownerOptions[this.data.selectedOwnerIndex],
          selectedVenue: this.data.venues[this.data.selectedVenueIndex],
          selectedChargeModeIndex: this.data.selectedChargeModeIndex,
          currentUserId: CURRENT_USER_ID,
        })
      );

      wx.showToast({
        title: this.data.createForm.sourceActivityId ? "已再次发布" : "活动已发布",
        icon: "success",
      });

      setTimeout(() => {
        this.handleBack();
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
