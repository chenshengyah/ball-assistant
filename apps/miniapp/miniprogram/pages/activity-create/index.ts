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
  getCurrentUserId,
  updateCurrentUserPhoneNumber,
  updateCurrentUserProfile,
} from "../../services/auth";
import {
  buildCreateActivityInput,
  createFormCourt,
  createImageBlock,
  createParagraphBlock,
  ensureDescriptionBlocks,
  getDefaultFormCourts,
  getDefaultCreateForm,
  mapDraftToCreateState,
  parseDescriptionRichtext,
  serializeDescriptionBlocks,
  type CreateForm,
  type DescriptionBlock,
  type FormCourt,
} from "../../services/activity-create-form";
import { pickCompressAndUploadImageAsset } from "../../services/asset-service";
import {
  createOrUpdateClub,
  fetchOwnedClubs,
  listOwnedClubs,
} from "../../services/club-service";
import type {
  OwnerOption,
  OwnerType,
  UserGender,
} from "../../types/activity";
import { getPageTopStyle } from "../../utils/chrome";

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
  phoneNumber: string;
  phoneComplete: boolean;
};

type ClubSheetForm = {
  clubId: string;
  coverUrl: string;
  logoUrl: string;
  name: string;
  description: string;
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
  availableCourts: FormCourt[];
  createForm: CreateForm;
  descriptionBlocks: DescriptionBlock[];
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

type ProfileFormChangeEvent = WechatMiniprogram.BaseEvent<ProfileSheetForm>;

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
  chooseLocation(options: {
    success(result: ChooseLocationSuccessResult): void;
    fail(error: MiniProgramLocationError): void;
  }): void;
};

const compatibleWx = wx as CompatibleWx;

function getResolvedCurrentUserId(): string {
  return getCurrentUserId() || "";
}

function isValidPhoneNumber(value: string): boolean {
  return /^1[3-9]\d{9}$/.test(value.trim());
}

function getAvatarInitial(nickname: string): string {
  return nickname.trim().slice(0, 1) || "你";
}

function getGenderIndex(gender?: UserGender | null): number {
  if (gender === "MALE") {
    return 1;
  }

  if (gender === "FEMALE") {
    return 2;
  }

  return 0;
}

function getGenderFromIndex(selectedGenderIndex: number): UserGender | null {
  if (selectedGenderIndex === 1) {
    return "MALE";
  }

  if (selectedGenderIndex === 2) {
    return "FEMALE";
  }

  return null;
}

function buildProfileSheetForm(): ProfileSheetForm {
  const currentUser = getCurrentUser();
  const authSnapshot = getAuthSnapshot();
  const nickname = authSnapshot.user?.nickname ?? "";
  const phoneNumber = authSnapshot.user?.phoneNumber ?? currentUser?.phoneNumber ?? "";

  return {
    avatarInitial: getAvatarInitial(nickname),
    avatarUrl: authSnapshot.user?.avatarUrl ?? currentUser?.avatarUrl ?? "",
    nickname,
    selectedGenderIndex: getGenderIndex(authSnapshot.user?.gender),
    phoneNumber,
    phoneComplete: Boolean(authSnapshot.contactProfileComplete) || isValidPhoneNumber(phoneNumber),
  };
}

function getEmptyClubSheetForm(): ClubSheetForm {
  return {
    clubId: "",
    coverUrl: "",
    logoUrl: "",
    name: "",
    description: "",
  };
}

function buildClubSheetForm(clubId = ""): ClubSheetForm {
  const club = listOwnedClubs(getResolvedCurrentUserId()).find((item) => item.id === clubId);

  if (!club) {
    return getEmptyClubSheetForm();
  }

  return {
    clubId: club.id,
    coverUrl: club.coverUrl ?? "",
    logoUrl: club.logoUrl ?? "",
    name: club.name,
    description: club.description ?? "",
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

  const club = listOwnedClubs(getResolvedCurrentUserId()).find(
    (item) => item.id === clubOptions[0]?.ownerId
  );

  if (!club?.contactPhone) {
    return {
      statusText: "待补手机号",
      title: club?.name || "俱乐部",
      meta: "补齐俱乐部联系人手机号后，才可用俱乐部身份发布。",
    };
  }

  if (!club.contactName) {
    return {
      statusText: "待完善",
      title: club.name,
      meta: "补齐创建人资料后，即可作为发布主体使用。",
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
      meta: personalReady ? "将展示你填写的联系手机号。" : "先补齐资料和联系手机号，再继续创建。",
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

function getOwnerContactHint(ownerOption?: OwnerOption): string {
  if (!ownerOption) {
    return "先选择个人或俱乐部角色，后续活动配置才会展开。";
  }

  if (ownerOption.ownerType === "PERSONAL") {
    return "个人发布时，将展示你填写的联系手机号。";
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
    availableCourts: getDefaultFormCourts(),
    createForm: getDefaultCreateForm(),
    descriptionBlocks: [createParagraphBlock()],
    showProfileSheet: false,
    profileSheetForm: {
      avatarInitial: "你",
      avatarUrl: "",
      nickname: "",
      selectedGenderIndex: 0,
      phoneNumber: "",
      phoneComplete: false,
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

      void this.hydratePage(sourceActivityId);
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
      await fetchOwnedClubs(getResolvedCurrentUserId());
    } catch (error) {
      this.showError(error);
    }

    await this.hydratePage(sourceActivityId);
  },

  async syncRemoteOwnerAssets(): Promise<void> {
    try {
      await fetchOwnedClubs(getResolvedCurrentUserId());
    } catch (error) {
      this.showError(error);
    }

    const ownerOptions = listOwnerOptions(getResolvedCurrentUserId());
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

    this.ensureDefaultCourts();
  },

  async hydratePage(sourceActivityId = ""): Promise<void> {
    const currentUser = getCurrentUser() ?? {
      id: getResolvedCurrentUserId(),
      nickname: "当前用户",
      gender: "MALE" as const,
      avatarColor: "#4C7CF0",
      phoneNumber: "",
      contactProfileComplete: false,
    };
    const ownerOptions = listOwnerOptions(getResolvedCurrentUserId());
    const profileSnapshot = getAuthSnapshot();
    const clubOptions = ownerOptions.filter((item) => item.ownerType === "CLUB");
    const defaultClubOwnerIndex = Math.max(
      clubOptions.findIndex((item) => item.ownerId === listOwnedClubs(getResolvedCurrentUserId())[0]?.id),
      0
    );

    if (sourceActivityId.length > 0) {
      try {
        const mapped = mapDraftToCreateState(
          await buildRepublishDraft(sourceActivityId, getResolvedCurrentUserId()),
          ownerOptions
        );
        const selectedOwner = ownerOptions[mapped.selectedOwnerIndex];

        this.setData({
          currentUserName: currentUser.nickname,
          ownerContactHint: getOwnerContactHint(selectedOwner),
          pageTitle: "再次发布",
          pageCaption: "已带出上次活动的配置，可直接修改后发布。",
          republishNotice: "",
          ownerOptions,
          ownerCardItems: buildRoleCards(ownerOptions),
          showRoleContent: true,
          selectedRoleType: selectedOwner?.ownerType ?? "",
          selectedSignupModeIndex: mapped.selectedSignupModeIndex,
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
          availableCourts: mapped.availableCourts,
          descriptionBlocks: ensureDescriptionBlocks(
            parseDescriptionRichtext(mapped.createForm.descriptionRichtext)
          ),
          profileSheetForm: {
            avatarInitial: getAvatarInitial(profileSnapshot.user?.nickname ?? ""),
            avatarUrl: profileSnapshot.user?.avatarUrl ?? "",
            nickname: profileSnapshot.user?.nickname ?? "",
            selectedGenderIndex: getGenderIndex(profileSnapshot.user?.gender),
            phoneNumber: profileSnapshot.user?.phoneNumber ?? currentUser.phoneNumber ?? "",
            phoneComplete: Boolean(profileSnapshot.contactProfileComplete),
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
      selectedOwnerIndex: -1,
      selectedRoleType: "",
      showRoleContent: false,
      selectedChargeModeIndex: 1,
      selectedCancelCutoffIndex: 1,
      availableCourts: getDefaultFormCourts(),
      createForm: getDefaultCreateForm(),
      descriptionBlocks: [createParagraphBlock()],
      profileSheetForm: {
        avatarInitial: getAvatarInitial(profileSnapshot.user?.nickname ?? ""),
        avatarUrl: profileSnapshot.user?.avatarUrl ?? "",
        nickname: profileSnapshot.user?.nickname ?? "",
        selectedGenderIndex: getGenderIndex(profileSnapshot.user?.gender),
        phoneNumber: profileSnapshot.user?.phoneNumber ?? currentUser.phoneNumber ?? "",
        phoneComplete: Boolean(profileSnapshot.contactProfileComplete),
      },
      clubOwnerLabels: clubOptions.map((item) => item.label),
      selectedClubOwnerIndex: defaultClubOwnerIndex,
      clubSheetForm: buildClubSheetForm(clubOptions[defaultClubOwnerIndex]?.ownerId ?? ""),
    });
  },

  ensureDefaultCourts(): void {
    if (this.data.availableCourts.length > 0) {
      return;
    }

    this.setData({
      availableCourts: getDefaultFormCourts(),
    });
  },

  updateDescriptionBlocks(blocks: DescriptionBlock[]): void {
    const nextBlocks = ensureDescriptionBlocks(blocks);

    this.setData({
      descriptionBlocks: nextBlocks,
      "createForm.descriptionRichtext": serializeDescriptionBlocks(nextBlocks),
    } as never);
  },

  async pickAndUploadImage(scene: "activity-cover" | "club-cover" | "club-logo"): Promise<string> {
    const uploaded = await pickCompressAndUploadImageAsset(scene);

    if (!uploaded) {
      return "";
    }

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

    this.ensureDefaultCourts();
  },

  handleProfileFormChange(event: ProfileFormChangeEvent): void {
    this.setData({
      profileSheetForm: event.detail,
    });
  },

  async handleSubmitProfileSheet(): Promise<void> {
    if (!this.data.profileSheetForm.avatarUrl) {
      wx.showToast({
        title: "请先选择头像",
        icon: "none",
      });
      return;
    }

    if (!this.data.profileSheetForm.nickname.trim()) {
      wx.showToast({
        title: "请先填写昵称",
        icon: "none",
      });
      return;
    }

    if (!isValidPhoneNumber(this.data.profileSheetForm.phoneNumber)) {
      wx.showToast({
        title: "请先填写正确手机号",
        icon: "none",
      });
      return;
    }

    const gender = getGenderFromIndex(this.data.profileSheetForm.selectedGenderIndex);

    if (!gender) {
      wx.showToast({
        title: "请先选择性别",
        icon: "none",
      });
      return;
    }

    try {
      await updateCurrentUserProfile({
        avatarUrl: this.data.profileSheetForm.avatarUrl,
        nickname: this.data.profileSheetForm.nickname,
        gender,
      });
      await updateCurrentUserPhoneNumber(this.data.profileSheetForm.phoneNumber);

      this.setData({
        currentUserName: this.data.profileSheetForm.nickname,
        ownerOptions: listOwnerOptions(getResolvedCurrentUserId()),
        ownerCardItems: buildRoleCards(listOwnerOptions(getResolvedCurrentUserId())),
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
      profileSheetForm: buildProfileSheetForm(),
      clubSheetForm: buildClubSheetForm(clubOwnerOptions[this.data.selectedClubOwnerIndex]?.ownerId ?? ""),
    });
  },

  async handleSubmitClubSheet(): Promise<void> {
    if (!this.data.profileSheetForm.avatarUrl) {
      wx.showToast({
        title: "请先选择头像",
        icon: "none",
      });
      return;
    }

    if (!this.data.profileSheetForm.nickname.trim()) {
      wx.showToast({
        title: "请先填写昵称",
        icon: "none",
      });
      return;
    }

    if (!isValidPhoneNumber(this.data.profileSheetForm.phoneNumber)) {
      wx.showToast({
        title: "请先填写正确手机号",
        icon: "none",
      });
      return;
    }

    const gender = getGenderFromIndex(this.data.profileSheetForm.selectedGenderIndex);

    if (!gender) {
      wx.showToast({
        title: "请先选择性别",
        icon: "none",
      });
      return;
    }

    try {
      const updatedProfile = await updateCurrentUserProfile({
        avatarUrl: this.data.profileSheetForm.avatarUrl,
        nickname: this.data.profileSheetForm.nickname,
        gender,
      });
      const updatedUser = await updateCurrentUserPhoneNumber(this.data.profileSheetForm.phoneNumber);
      const contactName = updatedUser?.nickname || updatedProfile?.nickname || this.data.profileSheetForm.nickname;
      const contactPhone = updatedUser?.phoneNumber || this.data.profileSheetForm.phoneNumber;
      const nextClub = await createOrUpdateClub({
        clubId: this.data.clubSheetForm.clubId || undefined,
        currentUserId: getResolvedCurrentUserId(),
        coverUrl: this.data.clubSheetForm.coverUrl,
        logoUrl: this.data.clubSheetForm.logoUrl,
        name: this.data.clubSheetForm.name,
        description: this.data.clubSheetForm.description,
        contactName,
        contactPhone,
      });

      const ownerOptions = listOwnerOptions(getResolvedCurrentUserId());
      const clubOwnerOptions = ownerOptions.filter((item) => item.ownerType === "CLUB");
      const selectedClubOwnerIndex = Math.max(
        clubOwnerOptions.findIndex((item) => item.ownerId === nextClub.id),
        0
      );

      this.setData({
        currentUserName: contactName,
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
      const ownedClub = listOwnedClubs(getResolvedCurrentUserId()).find(
        (item) => item.id === clubOptions[this.data.selectedClubOwnerIndex]?.ownerId
      );

      if (!ownedClub || !ownedClub.contactPhone || !ownedClub.contactName) {
        this.handleOpenClubSheet();
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
      const uploaded = await pickCompressAndUploadImageAsset("activity-detail");

      if (!uploaded) {
        return;
      }

      this.updateDescriptionBlocks([...this.data.descriptionBlocks, createImageBlock(uploaded.assetUrl)]);
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
      const uploaded = await pickCompressAndUploadImageAsset("activity-detail");

      if (!uploaded) {
        return;
      }

      const nextBlocks = this.data.descriptionBlocks.map((item, index) =>
        index === blockIndex && item.type === "image"
          ? {
              ...item,
              src: uploaded.assetUrl,
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

  handleAddCourt(): void {
    const nextIndex = this.data.availableCourts.length + 1;

    this.setData({
      availableCourts: [...this.data.availableCourts, createFormCourt(`${nextIndex} 号场`)],
    });
  },

  handleRemoveCourt(event: DatasetEvent): void {
    const courtIndex = Number(event.currentTarget.dataset.courtIndex);

    if (!Number.isFinite(courtIndex)) {
      return;
    }

    this.setData({
      availableCourts: this.data.availableCourts.filter((_, index) => index !== courtIndex),
    });
  },

  handleChooseVenueLocation(): void {
    compatibleWx.chooseLocation({
      success: (result) => {
        this.setData({
          "createForm.venueName": result.name || this.data.createForm.venueName,
          "createForm.venueAddress": result.address || this.data.createForm.venueAddress,
          "createForm.venueLatitude": `${result.latitude}`,
          "createForm.venueLongitude": `${result.longitude}`,
        } as never);
      },
      fail: (error) => {
        const message = typeof error.errMsg === "string" ? error.errMsg : "";

        if (!message.includes("cancel")) {
          this.showError(new Error("未能获取定位，请手动填写球馆信息"));
        }
      },
    });
  },

  handleVenueSheetTap(): void {},

  async handleSubmitCreate(): Promise<void> {
    try {
      const createForm = {
        ...this.data.createForm,
        descriptionRichtext: serializeDescriptionBlocks(this.data.descriptionBlocks),
      };
      const createdActivity = await createActivity(
        buildCreateActivityInput({
          createForm,
          availableCourts: this.data.availableCourts,
          ownerOption: this.data.ownerOptions[this.data.selectedOwnerIndex],
          selectedChargeModeIndex: this.data.selectedChargeModeIndex,
          currentUserId: getResolvedCurrentUserId(),
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
