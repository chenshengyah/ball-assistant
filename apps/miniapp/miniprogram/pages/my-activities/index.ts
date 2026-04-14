import {
  getAuthSnapshot,
  getCurrentMockUserId,
  requireCompleteProfile,
} from "../../services/auth";
import { listMyActivities } from "../../services/activity-service";

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
    published: [],
  } as MyActivitiesPageData,

  onLoad(): void {
    void this.ensureReady();
  },

  onShow(): void {
    if (getAuthSnapshot().status === "AUTHENTICATED_COMPLETE") {
      this.hydratePage();
    }
  },

  async ensureReady(): Promise<void> {
    const canContinue = await requireCompleteProfile({
      type: "OPEN_MY_ACTIVITIES",
    });

    if (!canContinue) {
      return;
    }

    this.hydratePage();
  },

  hydratePage(): void {
    const authSnapshot = getAuthSnapshot();

    if (authSnapshot.status !== "AUTHENTICATED_COMPLETE") {
      return;
    }

    const currentUserId = getCurrentMockUserId();

    if (!currentUserId) {
      return;
    }

    const activities = listMyActivities(currentUserId);

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
