import {
  ensureAuthenticated,
  getAuthSnapshot,
  getPendingIntent,
  resumePendingIntent,
  updateCurrentUserProfile,
} from "../../services/auth";
import type { UserGender } from "../../types/activity";

type PickerChangeEvent = WechatMiniprogram.BaseEvent<{
  value?: string;
}>;

type InputEvent = WechatMiniprogram.BaseEvent<{
  value?: string;
}>;

type RegistrationPageData = {
  genderLabels: string[];
  nickname: string;
  pendingLabel: string;
  selectedGenderIndex: number;
  sourceLabel: string;
};

function getPendingLabel(): string {
  const pendingIntent = getPendingIntent();

  if (!pendingIntent) {
    return "完善资料后，可继续浏览和使用角色相关动作。";
  }

  switch (pendingIntent.type) {
    case "CREATE_ACTIVITY":
      return "保存后将继续进入创建活动。";
    case "SIGN_UP_ACTIVITY":
      return "保存后将返回活动详情并自动重试报名。";
    case "CANCEL_SIGNUP":
      return "保存后将返回活动详情并自动重试取消报名。";
    case "OPEN_MY_ACTIVITIES":
      return "保存后将继续打开我的活动。";
    case "OPEN_CLUB_REGISTER":
      return "保存后将继续进入俱乐部入口。";
  }
}

function getSourceLabel(source: string): string {
  switch (source) {
    case "activity-create":
      return "来自创建活动";
    case "activity-detail":
      return "来自活动详情";
    case "my-activities":
      return "来自我的活动";
    case "club-register":
      return "来自俱乐部入口";
    default:
      return "资料补全";
  }
}

Page({
  data: {
    genderLabels: ["男", "女"],
    nickname: "",
    pendingLabel: "完善资料后，可继续浏览和使用角色相关动作。",
    selectedGenderIndex: 0,
    sourceLabel: "资料补全",
  } as RegistrationPageData,

  onLoad(options: Record<string, string | undefined>): void {
    const source =
      typeof options.source === "string" && options.source.length > 0
        ? decodeURIComponent(options.source)
        : "";

    void this.bootstrapPage(source);
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

    this.setData({
      nickname: authSnapshot.user?.nickname ?? "",
      pendingLabel: getPendingLabel(),
      selectedGenderIndex: authSnapshot.user?.gender === "FEMALE" ? 1 : 0,
      sourceLabel: getSourceLabel(source),
    });
  },

  handleNicknameInput(event: InputEvent): void {
    const nickname = typeof event.detail.value === "string" ? event.detail.value.trim() : "";

    this.setData({
      nickname,
    });
  },

  handleGenderChange(event: PickerChangeEvent): void {
    this.setData({
      selectedGenderIndex: Number(event.detail.value ?? 0),
    });
  },

  async handleSubmit(): Promise<void> {
    if (!this.data.nickname) {
      wx.showToast({
        title: "请先填写昵称",
        icon: "none",
      });
      return;
    }

    const gender: UserGender = this.data.selectedGenderIndex === 1 ? "FEMALE" : "MALE";

    try {
      await updateCurrentUserProfile({
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
