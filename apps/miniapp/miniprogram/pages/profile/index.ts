import {
  getAuthSnapshot,
  openUserRegistrationFromProfile,
  requireCompleteProfile,
} from "../../services/auth";
import { getPageTopStyle } from "../../utils/chrome";

type ProfilePageData = {
  actionButtonText: string;
  baseProfileLabel: string;
  hintText: string;
  initial: string;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  nickname: string;
  pageTopStyle: string;
  roleSummary: string;
  statusLabel: string;
};

Page({
  data: {
    actionButtonText: "登录并完善资料",
    baseProfileLabel: "基础资料待补齐",
    hintText: "游客可以先浏览首页和活动详情，进入创建、报名和我的活动时再登录。",
    initial: "游",
    isAuthenticated: false,
    isProfileComplete: false,
    nickname: "游客",
    pageTopStyle: "",
    roleSummary: "先看看活动，有需要时再补资料。",
    statusLabel: "游客模式",
  } as ProfilePageData,

  onLoad(): void {
    this.syncPageChrome();
    this.hydratePage();
  },

  onShow(): void {
    this.syncPageChrome();
    this.hydratePage();
  },

  syncPageChrome(): void {
    this.setData({
      pageTopStyle: getPageTopStyle(16),
    });
  },

  hydratePage(): void {
    const authSnapshot = getAuthSnapshot();
    const isAuthenticated = authSnapshot.status !== "ANONYMOUS";
    const isBaseProfileComplete = authSnapshot.baseProfileComplete;
    const isProfileComplete = isBaseProfileComplete;

    this.setData({
      actionButtonText: isAuthenticated ? "编辑资料" : "登录并完善资料",
      baseProfileLabel: isBaseProfileComplete ? "基础资料已完善" : "基础资料待补齐",
      hintText: isProfileComplete
        ? "资料已完善，创建活动和报名都可以直接继续。"
        : "游客可继续浏览公开内容，角色相关动作会在点击时要求补齐资料。",
      initial: (authSnapshot.user?.nickname ?? "游客").slice(0, 1),
      isAuthenticated,
      isProfileComplete,
      nickname: authSnapshot.user?.nickname ?? "游客",
      roleSummary: isProfileComplete
        ? "资料已完善，可使用报名、创建和我的活动。"
        : isAuthenticated
          ? "已登录，但还需要补齐头像昵称和性别。"
          : "首页、活动列表和活动详情都可以先看。",
      statusLabel: isProfileComplete
        ? "已完善资料"
        : isAuthenticated
          ? "待完善基础资料"
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
