import {
  getAuthSnapshot,
  openUserRegistrationFromProfile,
  requireCompleteProfile,
} from "../../services/auth";

type ProfilePageData = {
  actionButtonText: string;
  hintText: string;
  initial: string;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  nickname: string;
  roleSummary: string;
  statusLabel: string;
};

Page({
  data: {
    actionButtonText: "登录并完善资料",
    hintText: "游客可以先浏览首页和活动详情，进入创建、报名和我的活动时再登录。",
    initial: "游",
    isAuthenticated: false,
    isProfileComplete: false,
    nickname: "游客",
    roleSummary: "先看看活动，有需要时再补资料。",
    statusLabel: "游客模式",
  } as ProfilePageData,

  onLoad(): void {
    this.hydratePage();
  },

  onShow(): void {
    this.hydratePage();
  },

  hydratePage(): void {
    const authSnapshot = getAuthSnapshot();
    const isAuthenticated = authSnapshot.status !== "ANONYMOUS";
    const isProfileComplete = authSnapshot.status === "AUTHENTICATED_COMPLETE";

    this.setData({
      actionButtonText: isProfileComplete ? "编辑资料" : "登录并完善资料",
      hintText: isProfileComplete
        ? "角色相关入口已经可用，继续进入我的活动、创建活动或俱乐部入口。"
        : "游客可继续浏览公开内容，角色相关动作会在点击时要求补齐资料。",
      initial: (authSnapshot.user?.nickname ?? "游客").slice(0, 1),
      isAuthenticated,
      isProfileComplete,
      nickname: authSnapshot.user?.nickname ?? "游客",
      roleSummary: isProfileComplete
        ? "资料已完善，可使用报名、创建和我的活动。"
        : isAuthenticated
          ? "已登录，但还需要补齐昵称和性别。"
          : "首页、活动列表和活动详情都可以先看。",
      statusLabel: isProfileComplete
        ? "已完善资料"
        : isAuthenticated
          ? "待完善资料"
          : "游客模式",
    });
  },

  async handleOpenRegistration(): Promise<void> {
    await openUserRegistrationFromProfile();
  },

  async handleOpenMyActivities(): Promise<void> {
    const canContinue = await requireCompleteProfile({
      type: "OPEN_MY_ACTIVITIES",
    });

    if (!canContinue) {
      return;
    }

    wx.navigateTo({
      url: "/pages/my-activities/index",
    });
  },

  async handleOpenCreateActivity(): Promise<void> {
    const canContinue = await requireCompleteProfile({
      type: "CREATE_ACTIVITY",
    });

    if (!canContinue) {
      return;
    }

    wx.navigateTo({
      url: "/pages/activity-create/index",
    });
  },

  async handleOpenClubRegister(): Promise<void> {
    const canContinue = await requireCompleteProfile({
      type: "OPEN_CLUB_REGISTER",
    });

    if (!canContinue) {
      return;
    }

    wx.showToast({
      title: "俱乐部注册页建设中",
      icon: "none",
    });
  },
});
