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

type PickerChangeEvent = WechatMiniprogram.BaseEvent<{
  value?: string;
}>;

type InputEvent = WechatMiniprogram.BaseEvent<{
  value?: string;
}>;

type ChooseAvatarEvent = WechatMiniprogram.BaseEvent<{
  avatarUrl?: string;
}>;

type PhoneNumberEvent = WechatMiniprogram.BaseEvent<{
  code?: string;
}>;

type RegistrationPageData = {
  avatarInitial: string;
  avatarUrl: string;
  genderLabels: string[];
  navFallbackUrl: string;
  nickname: string;
  pageTopStyle: string;
  pendingLabel: string;
  phoneMasked: string;
  phoneVerified: boolean;
  requirePhone: boolean;
  selectedGenderIndex: number;
  sourceLabel: string;
  submitButtonText: string;
  subtitle: string;
  title: string;
};

function getAvatarInitial(nickname: string): string {
  return nickname.trim().slice(0, 1) || "你";
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
      subtitle: "完善头像昵称、基础资料和手机号后，即可继续发布活动。",
      title: "完善资料与联系方式",
    };
  }

  if (source === "activity-detail") {
    return {
      pendingLabel: "保存后将返回活动详情并自动继续刚才的动作。",
      requirePhone: true,
      sourceLabel: "来自活动详情",
      submitButtonText: "保存并继续报名",
      subtitle: "完善头像昵称、基础资料和手机号后，即可继续使用活动相关动作。",
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
    avatarInitial: "你",
    avatarUrl: "",
    genderLabels: ["男", "女"],
    navFallbackUrl: "/pages/profile/index",
    nickname: "",
    pageTopStyle: "",
    pendingLabel: "保存后，可继续浏览和使用角色相关动作。",
    phoneMasked: "",
    phoneVerified: false,
    requirePhone: false,
    selectedGenderIndex: 0,
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

    this.setData({
      avatarInitial: getAvatarInitial(nickname),
      avatarUrl: authSnapshot.user?.avatarUrl ?? "",
      navFallbackUrl: resolveOwningTab("/pages/user-registration/index", source),
      nickname,
      pendingLabel: copy.pendingLabel,
      phoneMasked: authSnapshot.user?.phoneNumber
        ? `${authSnapshot.user.phoneNumber.slice(0, 3)}****${authSnapshot.user.phoneNumber.slice(-4)}`
        : "",
      phoneVerified: Boolean(authSnapshot.user?.contactProfileComplete),
      requirePhone: copy.requirePhone,
      selectedGenderIndex: authSnapshot.user?.gender === "FEMALE" ? 1 : 0,
      sourceLabel: copy.sourceLabel,
      submitButtonText: copy.submitButtonText,
      subtitle: copy.subtitle,
      title: copy.title,
    });
  },

  handleNicknameInput(event: InputEvent): void {
    const nickname = typeof event.detail.value === "string" ? event.detail.value.trim() : "";

    this.setData({
      avatarInitial: getAvatarInitial(nickname),
      nickname,
    });
  },

  handleChooseAvatar(event: ChooseAvatarEvent): void {
    const avatarUrl = typeof event.detail.avatarUrl === "string" ? event.detail.avatarUrl : "";

    this.setData({
      avatarUrl,
    });
  },

  handleGenderChange(event: PickerChangeEvent): void {
    this.setData({
      selectedGenderIndex: Number(event.detail.value ?? 0),
    });
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
        phoneMasked: updatedUser?.phoneNumber
          ? `${updatedUser.phoneNumber.slice(0, 3)}****${updatedUser.phoneNumber.slice(-4)}`
          : "",
        phoneVerified: Boolean(updatedUser?.contactProfileComplete),
      });
    } catch (error) {
      const title = error instanceof Error ? error.message : "手机号验证失败，请稍后重试";

      wx.showToast({
        title,
        icon: "none",
      });
    }
  },

  async handleSubmit(): Promise<void> {
    if (!this.data.nickname) {
      wx.showToast({
        title: "请先填写昵称",
        icon: "none",
      });
      return;
    }

    if (this.data.requirePhone && !this.data.phoneVerified) {
      wx.showToast({
        title: "请先完成手机号验证",
        icon: "none",
      });
      return;
    }

    const gender: UserGender = this.data.selectedGenderIndex === 1 ? "FEMALE" : "MALE";

    try {
      await updateCurrentUserProfile({
        avatarUrl: this.data.avatarUrl,
        nickname: this.data.nickname,
        gender,
      });

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
