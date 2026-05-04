import { pickCompressAndUploadImageAsset } from "../../services/asset-service";
import { createOrUpdateClub, fetchOwnedClubs, getOwnedClubById } from "../../services/club-service";
import {
  ensureAuthenticated,
  getAuthSnapshot,
  getCurrentUserId,
  updateCurrentUserPhoneNumber,
  updateCurrentUserProfile,
} from "../../services/auth";
import type { UserGender } from "../../types/activity";
import { getPageTopStyle } from "../../utils/chrome";
import { resolveOwningTab } from "../../utils/navigation";

type ClubRegisterForm = {
  clubId: string;
  name: string;
  coverUrl: string;
  logoUrl: string;
  description: string;
};

type ProfileFormValue = {
  avatarInitial: string;
  avatarUrl: string;
  nickname: string;
  selectedGenderIndex: number;
  phoneNumber: string;
  phoneComplete: boolean;
};

type ClubRegisterPageData = {
  form: ClubRegisterForm;
  navFallbackUrl: string;
  pageTopStyle: string;
  profileForm: ProfileFormValue;
  source: string;
  subtitle: string;
  submitText: string;
  title: string;
};

type InputEvent = WechatMiniprogram.BaseEvent<{ value?: string }>;
type DatasetEvent = WechatMiniprogram.BaseEvent<{ field?: string }>;
type ProfileFormChangeEvent = WechatMiniprogram.BaseEvent<ProfileFormValue>;

function getResolvedCurrentUserId(): string {
  return getCurrentUserId() || "";
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

function isValidPhoneNumber(value: string): boolean {
  return /^1[3-9]\d{9}$/.test(value.trim());
}

function getProfileForm(): ProfileFormValue {
  const authSnapshot = getAuthSnapshot();
  const nickname = authSnapshot.user?.nickname ?? "";
  const phoneNumber = authSnapshot.user?.phoneNumber ?? "";

  return {
    avatarInitial: getAvatarInitial(nickname),
    avatarUrl: authSnapshot.user?.avatarUrl ?? "",
    nickname,
    selectedGenderIndex: getGenderIndex(authSnapshot.user?.gender),
    phoneNumber,
    phoneComplete: isValidPhoneNumber(phoneNumber),
  };
}

function getEmptyForm(): ClubRegisterForm {
  return {
    clubId: "",
    name: "",
    coverUrl: "",
    logoUrl: "",
    description: "",
  };
}

function getCopy(source: string, hasClubId: boolean): Pick<
  ClubRegisterPageData,
  "subtitle" | "submitText" | "title"
> {
  if (source === "activity-create") {
    return {
      title: hasClubId ? "完善俱乐部资料" : "创建俱乐部主体",
      subtitle: "完成后会回到创建活动，继续选择俱乐部身份并填写球馆。",
      submitText: hasClubId ? "保存并返回创建活动" : "创建并返回创建活动",
    };
  }

  return {
    title: hasClubId ? "俱乐部资料" : "创建俱乐部",
    subtitle: "从我的入口创建或完善俱乐部资料，后续可继续创建活动。",
    submitText: hasClubId ? "保存并进入俱乐部管理" : "创建并进入俱乐部管理",
  };
}

function buildForm(clubId = ""): ClubRegisterForm {
  const club = getOwnedClubById(getResolvedCurrentUserId(), clubId);

  if (!club) {
    return getEmptyForm();
  }

  return {
    clubId: club.id,
    name: club.name,
    coverUrl: club.coverUrl ?? "",
    logoUrl: club.logoUrl ?? "",
    description: club.description ?? "",
  };
}

Page({
  data: {
    form: getEmptyForm(),
    navFallbackUrl: "/pages/profile/index",
    pageTopStyle: "",
    profileForm: getProfileForm(),
    source: "profile",
    subtitle: "从我的入口创建或完善俱乐部资料，后续可继续创建活动。",
    submitText: "创建并进入俱乐部管理",
    title: "创建俱乐部",
  } as ClubRegisterPageData,

  onLoad(options: Record<string, string | undefined>): void {
    this.syncPageChrome();
    const source =
      typeof options.source === "string" && options.source.length > 0
        ? decodeURIComponent(options.source)
        : "profile";
    const clubId =
      typeof options.clubId === "string" && options.clubId.length > 0
        ? decodeURIComponent(options.clubId)
        : "";

    void this.bootstrapPage(source, clubId);
  },

  onShow(): void {
    this.syncPageChrome();
  },

  syncPageChrome(): void {
    this.setData({
      pageTopStyle: getPageTopStyle(16),
    });
  },

  async bootstrapPage(source: string, clubId: string): Promise<void> {
    const canContinue = await ensureAuthenticated();

    if (!canContinue) {
      return;
    }

    try {
      await fetchOwnedClubs(getResolvedCurrentUserId());
    } catch (error) {
      this.showError(error);
    }

    const copy = getCopy(source, Boolean(clubId));

    this.setData({
      form: buildForm(clubId),
      navFallbackUrl: resolveOwningTab("/pages/club-register/index", source),
      profileForm: getProfileForm(),
      source,
      subtitle: copy.subtitle,
      submitText: copy.submitText,
      title: copy.title,
    });
  },

  handleProfileFormChange(event: ProfileFormChangeEvent): void {
    this.setData({
      profileForm: event.detail,
    });
  },

  handleInput(event: InputEvent & DatasetEvent): void {
    const field = event.currentTarget.dataset.field;
    const value = typeof event.detail.value === "string" ? event.detail.value : "";

    if (!field) {
      return;
    }

    this.setData({
      [`form.${field}`]: value,
    } as never);
  },

  async handleUploadCover(): Promise<void> {
    try {
      const uploaded = await pickCompressAndUploadImageAsset("club-cover");

      if (uploaded) {
        this.setData({
          "form.coverUrl": uploaded.assetUrl,
        } as never);
      }
    } catch (error) {
      this.showError(error);
    }
  },

  async handleUploadLogo(): Promise<void> {
    try {
      const uploaded = await pickCompressAndUploadImageAsset("club-logo");

      if (uploaded) {
        this.setData({
          "form.logoUrl": uploaded.assetUrl,
        } as never);
      }
    } catch (error) {
      this.showError(error);
    }
  },

  async handleSubmit(): Promise<void> {
    if (!this.data.profileForm.avatarUrl) {
      wx.showToast({
        title: "请先选择头像",
        icon: "none",
      });
      return;
    }

    if (!this.data.profileForm.nickname) {
      wx.showToast({
        title: "请先填写昵称",
        icon: "none",
      });
      return;
    }

    if (!isValidPhoneNumber(this.data.profileForm.phoneNumber)) {
      wx.showToast({
        title: "请先填写正确手机号",
        icon: "none",
      });
      return;
    }

    const gender = getGenderFromIndex(this.data.profileForm.selectedGenderIndex);

    if (!gender) {
      wx.showToast({
        title: "请先选择性别",
        icon: "none",
      });
      return;
    }

    try {
      const updatedProfile = await updateCurrentUserProfile({
        avatarUrl: this.data.profileForm.avatarUrl,
        nickname: this.data.profileForm.nickname,
        gender,
      });
      const updatedUser = await updateCurrentUserPhoneNumber(this.data.profileForm.phoneNumber);
      const contactName = updatedUser?.nickname || updatedProfile?.nickname || this.data.profileForm.nickname;
      const contactPhone = updatedUser?.phoneNumber || this.data.profileForm.phoneNumber;
      const nextClub = await createOrUpdateClub({
        clubId: this.data.form.clubId || undefined,
        currentUserId: getResolvedCurrentUserId(),
        name: this.data.form.name,
        coverUrl: this.data.form.coverUrl,
        logoUrl: this.data.form.logoUrl,
        description: this.data.form.description,
        contactName,
        contactPhone,
      });

      wx.showToast({
        title: this.data.form.clubId ? "已保存" : "俱乐部已创建",
        icon: "success",
      });

      if (this.data.source === "activity-create") {
        if (getCurrentPages().length > 1) {
          wx.navigateBack();
          return;
        }

        wx.redirectTo({
          url: "/pages/activity-create/index",
        });
        return;
      }

      wx.redirectTo({
        url: `/pages/club-management/index?source=${encodeURIComponent(
          this.data.source || "profile"
        )}&clubId=${encodeURIComponent(nextClub.id)}`,
      });
    } catch (error) {
      this.showError(error);
    }
  },

  showError(error: unknown): void {
    wx.showToast({
      title: error instanceof Error ? error.message : "保存失败，请稍后重试",
      icon: "none",
    });
  },
});
