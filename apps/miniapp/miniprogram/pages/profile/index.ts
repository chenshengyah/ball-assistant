import {
  ensureAuthenticated,
  getAuthSnapshot,
  openUserRegistrationFromProfile,
  requireCompleteProfile,
} from "../../services/auth";
import { fetchOwnedClubs, listOwnedClubs } from "../../services/club-service";
import { getPageTopStyle } from "../../utils/chrome";

type ProfilePageData = {
  actionButtonText: string;
  baseProfileLabel: string;
  clubEntryDescription: string;
  clubEntryTitle: string;
  hintText: string;
  initial: string;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  nickname: string;
  pageTopStyle: string;
  quickActionDescription: string;
  roleSummary: string;
  statusLabel: string;
};

Page({
  data: {
    actionButtonText: "登录并完善资料",
    baseProfileLabel: "基础资料待补齐",
    clubEntryDescription: "先创建俱乐部主体，再逐步维护资料和场馆。",
    clubEntryTitle: "俱乐部入口",
    hintText: "游客可以先浏览首页和活动详情，进入创建、报名和我的活动时再登录。",
    initial: "游",
    isAuthenticated: false,
    isProfileComplete: false,
    nickname: "游客",
    pageTopStyle: "",
    quickActionDescription: "活动浏览已经并回首页，常用动作都从这里继续。",
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
      clubEntryDescription: isBaseProfileComplete
        ? "已登录后按状态进入俱乐部注册或俱乐部管理。"
        : "先补齐基础资料，再进入俱乐部相关能力。",
      clubEntryTitle: "俱乐部入口",
      hintText: isProfileComplete
        ? "资料已完善，创建活动和报名都可以直接继续。"
        : "游客可继续浏览公开内容，角色相关动作会在点击时要求补齐资料。",
      initial: (authSnapshot.user?.nickname ?? "游客").slice(0, 1),
      isAuthenticated,
      isProfileComplete,
      nickname: authSnapshot.user?.nickname ?? "游客",
      quickActionDescription: isAuthenticated
        ? "我的活动、创建活动和俱乐部管理都可以从这里直达。"
        : "先浏览首页，需要操作时再登录也来得及。",
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
    const canContinue = await ensureAuthenticated();

    if (!canContinue) {
      return;
    }

    wx.navigateTo({
      url: "/pages/activity-create/index",
    });
  },

  async handleOpenClubRegister(): Promise<void> {
    const canContinue = await requireCompleteProfile({
      type: "OPEN_CLUB_MANAGEMENT",
      source: "profile",
    });

    if (!canContinue) {
      return;
    }

    try {
      await fetchOwnedClubs("user-current");
    } catch {
      // Keep local snapshot as fallback for UI continuity.
    }

    const clubs = listOwnedClubs("user-current");

    wx.navigateTo({
      url:
        clubs.length > 0
          ? "/pages/club-management/index?source=profile"
          : "/pages/club-register/index?source=profile",
    });
  },
});
