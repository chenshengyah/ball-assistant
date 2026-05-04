import {
  ensureAuthenticated,
  getAuthSnapshot,
  resumePendingIntent,
  updateCurrentUserPhoneNumber,
  updateCurrentUserProfile,
} from "../../services/auth";
import type { UserGender } from "../../types/activity";
import { getPageTopStyle } from "../../utils/chrome";
import { resolveOwningTab } from "../../utils/navigation";

type ProfileFormValue = {
  avatarInitial: string;
  avatarUrl: string;
  nickname: string;
  selectedGenderIndex: number;
  phoneNumber: string;
  phoneComplete: boolean;
};

type ProfileFormChangeEvent = WechatMiniprogram.BaseEvent<ProfileFormValue>;

type RegistrationPageData = {
  navFallbackUrl: string;
  pageTopStyle: string;
  pendingLabel: string;
  profileForm: ProfileFormValue;
  requirePhone: boolean;
  sourceLabel: string;
  submitButtonText: string;
  subtitle: string;
  title: string;
};

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

function getCopy(source: string): {
  pendingLabel: string;
  requirePhone: boolean;
  sourceLabel: string;
  submitButtonText: string;
  subtitle: string;
  title: string;
} {
  if (source === "activity-create") {
    return {
      pendingLabel: "保存后将继续进入创建活动。",
      requirePhone: true,
      sourceLabel: "来自创建活动",
      submitButtonText: "保存并继续发布",
      subtitle: "完善头像昵称、基础资料和联系手机号后，即可继续发布活动。",
      title: "完善资料与联系方式",
    };
  }

  if (source === "activity-detail") {
    return {
      pendingLabel: "保存后将返回活动详情并自动继续刚才的动作。",
      requirePhone: true,
      sourceLabel: "来自活动详情",
      submitButtonText: "保存并继续报名",
      subtitle: "完善头像昵称、基础资料和联系手机号后，即可继续使用活动相关动作。",
      title: "完善资料与联系方式",
    };
  }

  if (source === "my-activities") {
    return {
      pendingLabel: "保存后将继续打开我的活动。",
      requirePhone: false,
      sourceLabel: "来自我的活动",
      submitButtonText: "保存并继续查看",
      subtitle: "完善基础资料后，可继续使用我的活动等个人入口。",
      title: "先补齐基础资料",
    };
  }

  if (source === "club-register") {
    return {
      pendingLabel: "保存后将继续进入俱乐部入口。",
      requirePhone: false,
      sourceLabel: "来自俱乐部入口",
      submitButtonText: "保存并继续",
      subtitle: "完善基础资料后，可继续进入俱乐部相关功能。",
      title: "先补齐基础资料",
    };
  }

  if (source === "club-management") {
    return {
      pendingLabel: "保存后将继续打开俱乐部管理。",
      requirePhone: false,
      sourceLabel: "来自俱乐部管理",
      submitButtonText: "保存并继续管理",
      subtitle: "完善基础资料后，可继续维护俱乐部信息和场馆。",
      title: "先补齐基础资料",
    };
  }

  if (source === "profile") {
    return {
      pendingLabel: "保存后将返回我的页。",
      requirePhone: false,
      sourceLabel: "来自我的",
      submitButtonText: "保存并返回我的",
      subtitle: "完善头像昵称和基础资料后，个人入口会更完整。",
      title: "先补齐基础资料",
    };
  }

  return {
    pendingLabel: "保存后，可继续浏览和使用角色相关动作。",
    requirePhone: false,
    sourceLabel: "资料补全",
    submitButtonText: "保存资料",
    subtitle: "完善头像昵称和基础资料后，可继续使用相关功能。",
    title: "先补齐基础资料",
  };
}

Page({
  data: {
    navFallbackUrl: "/pages/profile/index",
    pageTopStyle: "",
    pendingLabel: "保存后，可继续浏览和使用角色相关动作。",
    profileForm: {
      avatarInitial: "你",
      avatarUrl: "",
      nickname: "",
      selectedGenderIndex: 0,
      phoneNumber: "",
      phoneComplete: false,
    },
    requirePhone: false,
    sourceLabel: "资料补全",
    submitButtonText: "保存资料",
    subtitle: "完善头像昵称和基础资料后，可继续使用相关功能。",
    title: "先补齐基础资料",
  } as RegistrationPageData,

  onLoad(options: Record<string, string | undefined>): void {
    this.syncPageChrome();
    const source =
      typeof options.source === "string" && options.source.length > 0
        ? decodeURIComponent(options.source)
        : "";

    void this.bootstrapPage(source);
  },

  onShow(): void {
    this.syncPageChrome();
  },

  syncPageChrome(): void {
    this.setData({
      pageTopStyle: getPageTopStyle(20),
    });
  },

  async bootstrapPage(source: string): Promise<void> {
    const isAuthenticated = await ensureAuthenticated();

    if (!isAuthenticated) {
      return;
    }

    this.hydratePage(source);
  },

  hydratePage(source: string): void {
    const authSnapshot = getAuthSnapshot();
    const copy = getCopy(source);
    const nickname = authSnapshot.user?.nickname ?? "";
    const phoneNumber = authSnapshot.user?.phoneNumber ?? "";

    this.setData({
      navFallbackUrl: resolveOwningTab("/pages/user-registration/index", source),
      pendingLabel: copy.pendingLabel,
      profileForm: {
        avatarInitial: getAvatarInitial(nickname),
        avatarUrl: authSnapshot.user?.avatarUrl ?? "",
        nickname,
        selectedGenderIndex: getGenderIndex(authSnapshot.user?.gender),
        phoneNumber,
        phoneComplete: isValidPhoneNumber(phoneNumber),
      },
      requirePhone: copy.requirePhone,
      sourceLabel: copy.sourceLabel,
      submitButtonText: copy.submitButtonText,
      subtitle: copy.subtitle,
      title: copy.title,
    });
  },

  handleProfileFormChange(event: ProfileFormChangeEvent): void {
    this.setData({
      profileForm: event.detail,
    });
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

    if (this.data.requirePhone && !isValidPhoneNumber(this.data.profileForm.phoneNumber)) {
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
      await updateCurrentUserProfile({
        avatarUrl: this.data.profileForm.avatarUrl,
        nickname: this.data.profileForm.nickname,
        gender,
      });

      if (this.data.requirePhone) {
        await updateCurrentUserPhoneNumber(this.data.profileForm.phoneNumber);
      }

      wx.showToast({
        title: "资料已保存",
        icon: "success",
      });

      resumePendingIntent();
    } catch (error) {
      const title = error instanceof Error ? error.message : "保存失败，请稍后重试";

      wx.showToast({
        title,
        icon: "none",
      });
    }
  },
});
