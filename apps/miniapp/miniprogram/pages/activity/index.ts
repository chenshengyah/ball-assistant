import { SIGNUP_MODE_LABELS } from "../../constants/activity";
import {
  getActivityStats,
  getCurrentUser,
  listActivities,
  listOwnerOptions,
} from "../../services/activity-service";
import { getCurrentMockUserId, requireCompleteProfile } from "../../services/auth";
import { listVenues } from "../../services/venue-service";
import type { ActivityView, VenueWithCourts } from "../../types/activity";
import { getChromeMetrics } from "../../utils/chrome";

type Segment = "activities" | "venues";

type ActivityCard = {
  id: string;
  title: string;
  ownerLabel: string;
  statusLabel: string;
  signupStatusLabel: string;
  signupModeLabel: string;
  venueLabel: string;
  scheduleText: string;
  chargeText: string;
  cancelDeadlineText: string;
  currentUserSignupLabel: string;
  confirmedCount: number;
  waitlistCount: number;
  isManageable: boolean;
};

type ActivityPageData = {
  activeSegment: Segment;
  activityCards: ActivityCard[];
  venues: VenueWithCourts[];
  currentUserName: string;
  currentUserInitial: string;
  currentUserAvatarColor: string;
  currentUserRoleSummary: string;
  publishedCount: number;
  manageableCount: number;
  joinedCount: number;
  capsuleStyle: string;
  contentStyle: string;
  headerStyle: string;
  heroEyebrow: string;
  heroSubtitle: string;
  isGuest: boolean;
};

type DatasetEvent = WechatMiniprogram.BaseEvent<{
  activityId?: string;
  field?: string;
}>;

function mapActivitiesToCards(activities: ActivityView[]): ActivityCard[] {
  return activities.map((activity) => ({
    id: activity.id,
    title: activity.title,
    ownerLabel: activity.ownerLabel,
    statusLabel: activity.lifecycleStatusLabel,
    signupStatusLabel: activity.signupStatusLabel,
    signupModeLabel: SIGNUP_MODE_LABELS[activity.signupMode],
    venueLabel: activity.venueLabel,
    scheduleText: activity.scheduleText,
    chargeText: activity.chargeText,
    cancelDeadlineText: activity.cancelDeadlineText,
    currentUserSignupLabel: activity.currentUserSignupLabel,
    confirmedCount: activity.confirmedCount,
    waitlistCount: activity.waitlistCount,
    isManageable: activity.isManageable,
  }));
}

Page({
  data: {
    activeSegment: "activities",
    activityCards: [],
    venues: [],
    currentUserName: "游客浏览",
    currentUserInitial: "游",
    currentUserAvatarColor: "#CBD5E1",
    currentUserRoleSummary: "可以先看活动详情，报名和创建时再登录",
    publishedCount: 0,
    manageableCount: 0,
    joinedCount: 0,
    capsuleStyle: "",
    contentStyle: "",
    headerStyle: "",
    heroEyebrow: "公共浏览",
    heroSubtitle: "活动详情对所有用户开放，创建和报名会在动作触发时要求登录并补资料。",
    isGuest: true,
  } as ActivityPageData,

  onLoad(): void {
    this.syncChromeMetrics();
    this.hydratePage();
  },

  onShow(): void {
    this.syncChromeMetrics();
    this.hydratePage();
  },

  syncChromeMetrics(): void {
    const metrics = getChromeMetrics();

    this.setData({
      capsuleStyle: `width:${metrics.menuButtonRect.width}px;height:${metrics.menuButtonRect.height}px;`,
      contentStyle: `padding:${metrics.contentTopPadding}px 20px ${metrics.pageBottomPadding}px;`,
      headerStyle: `height:${metrics.navBarHeight}px;padding-top:${metrics.statusBarHeight}px;`,
    });
  },

  hydratePage(): void {
    const currentUserId = getCurrentMockUserId();
    const currentUser = getCurrentUser();
    const activities = listActivities(currentUserId);
    const isGuest = !currentUserId;
    const stats = currentUserId
      ? getActivityStats(currentUserId)
      : {
          publishedCount: activities.filter((activity) => activity.status === "PUBLISHED").length,
          manageableCount: 0,
          joinedCount: 0,
        };
    const ownerOptions = currentUserId ? listOwnerOptions(currentUserId) : [];

    this.setData({
      activityCards: mapActivitiesToCards(activities),
      venues: listVenues(),
      currentUserName: currentUser?.nickname ?? "游客浏览",
      currentUserInitial: (currentUser?.nickname ?? "游客").slice(0, 1),
      currentUserAvatarColor: currentUser?.avatarColor ?? "#CBD5E1",
      currentUserRoleSummary: isGuest
        ? "可以先看活动详情，报名和创建时再登录"
        : ownerOptions.map((item) => item.label).join(" / ") || "已登录，可进入角色相关动作",
      publishedCount: stats.publishedCount,
      manageableCount: stats.manageableCount,
      joinedCount: stats.joinedCount,
      heroEyebrow: isGuest ? "公共浏览" : "当前登录",
      heroSubtitle: isGuest
        ? "所有活动先开放浏览，报名和创建时再触发登录与资料补全。"
        : "你可以继续浏览全部活动，也可以进入详情执行报名或管理动作。",
      isGuest,
    });
  },

  handleSegmentChange(event: DatasetEvent): void {
    const segment = event.currentTarget.dataset.field as Segment | undefined;

    if (!segment) {
      return;
    }

    this.setData({
      activeSegment: segment,
    });
  },

  async handleOpenCreate(): Promise<void> {
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

  handleOpenDetail(event: DatasetEvent): void {
    const activityId = event.currentTarget.dataset.activityId;

    if (typeof activityId !== "string" || activityId.length === 0) {
      return;
    }

    wx.navigateTo({
      url: `/pages/activity-detail/index?activityId=${encodeURIComponent(activityId)}`,
    });
  },

  async handleRepublish(event: DatasetEvent): Promise<void> {
    const activityId = event.currentTarget.dataset.activityId;

    if (typeof activityId !== "string" || activityId.length === 0) {
      return;
    }

    const canContinue = await requireCompleteProfile({
      type: "CREATE_ACTIVITY",
    });

    if (!canContinue) {
      return;
    }

    wx.navigateTo({
      url: `/pages/activity-create/index?sourceActivityId=${encodeURIComponent(activityId)}`,
    });
  },
});
