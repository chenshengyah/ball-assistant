import {
  getAuthSnapshot,
  getCurrentUserId,
  requireCompleteProfile,
} from "../../services/auth";
import { listMyActivities } from "../../services/activity-service";
import { getPageTopStyle } from "../../utils/chrome";

type ActivityCard = {
  id: string;
  ownerLabel: string;
  scheduleText: string;
  signupLabel: string;
  title: string;
};

type MyActivitiesPageData = {
  isReady: boolean;
  joined: ActivityCard[];
  pageTopStyle: string;
  published: ActivityCard[];
};

function mapActivityCard(activity: {
  id: string;
  ownerLabel: string;
  scheduleText: string;
  currentUserSignupLabel: string;
  title: string;
}): ActivityCard {
  return {
    id: activity.id,
    ownerLabel: activity.ownerLabel,
    scheduleText: activity.scheduleText,
    signupLabel: activity.currentUserSignupLabel,
    title: activity.title,
  };
}

Page({
  data: {
    isReady: false,
    joined: [],
    pageTopStyle: "",
    published: [],
  } as MyActivitiesPageData,

  onLoad(): void {
    this.syncPageChrome();
    void this.ensureReady();
  },

  onShow(): void {
    this.syncPageChrome();
    if (getAuthSnapshot().baseProfileComplete) {
      void this.hydratePage();
    }
  },

  syncPageChrome(): void {
    this.setData({
      pageTopStyle: getPageTopStyle(20),
    });
  },

  async ensureReady(): Promise<void> {
    const canContinue = await requireCompleteProfile({
      type: "OPEN_MY_ACTIVITIES",
    });

    if (!canContinue) {
      return;
    }

    await this.hydratePage();
  },

  async hydratePage(): Promise<void> {
    const authSnapshot = getAuthSnapshot();

    if (!authSnapshot.baseProfileComplete) {
      return;
    }

    const currentUserId = getCurrentUserId();

    if (!currentUserId) {
      return;
    }

    const activities = await listMyActivities();

    this.setData({
      isReady: true,
      joined: activities.joined.map(mapActivityCard),
      published: activities.published.map(mapActivityCard),
    });
  },

  handleOpenDetail(event: WechatMiniprogram.BaseEvent<{ activityId?: string }>): void {
    const activityId = event.currentTarget.dataset.activityId;

    if (typeof activityId !== "string" || activityId.length === 0) {
      return;
    }

    wx.navigateTo({
      url: `/pages/activity-detail/index?activityId=${encodeURIComponent(activityId)}`,
    });
  },
});
