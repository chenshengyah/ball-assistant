import { SIGNUP_STATUS_LABELS } from "../../constants/activity";
import {
  cancelRegistration,
  getActivityStats,
  getCurrentUser,
  listActivities,
  listOwnerOptions,
  moveRegistration,
  signUpForActivity,
  signUpForCourt,
  updateActivityCourtCapacity,
} from "../../services/activity-service";
import { listVenues } from "../../services/venue-service";
import type { ActivityView, VenueWithCourts } from "../../types/activity";
import { getChromeMetrics } from "../../utils/chrome";

type Segment = "activities" | "venues";

type ActivityCardRegistration = {
  registrationId: string;
  nickname: string;
  tagText: string;
  isCurrentUser: boolean;
};

type ActivityCardCourt = {
  id: string;
  label: string;
  capacity: number;
  confirmedCount: number;
  occupancyText: string;
  waitlistText: string;
  signupButtonText: string;
  canSignup: boolean;
  canDecreaseCapacity: boolean;
  registrations: ActivityCardRegistration[];
};

type ActivityCard = {
  id: string;
  title: string;
  ownerLabel: string;
  statusLabel: string;
  signupStatusLabel: string;
  signupMode: string;
  signupModeLabel: string;
  venueLabel: string;
  scheduleText: string;
  chargeText: string;
  cancelDeadlineText: string;
  descriptionRichtext: string;
  currentUserSignupLabel: string;
  canCancelCurrentUserRegistration: boolean;
  currentUserRegistrationId: string;
  isManageable: boolean;
  canManage: boolean;
  totalCapacity: number | null;
  totalCapacityText: string;
  canGeneralSignUp: boolean;
  generalSignupButtonText: string;
  registrations: ActivityCardRegistration[];
  confirmedCount: number;
  waitlistCount: number;
  courts: ActivityCardCourt[];
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
};

type DatasetEvent = WechatMiniprogram.BaseEvent<{
  activityId?: string;
  activityCourtId?: string;
  registrationId?: string;
  delta?: number;
  field?: string;
}>;

const CURRENT_USER_ID = "user-current";

function mapActivitiesToCards(activities: ActivityView[]): ActivityCard[] {
  return activities.map((activity) => ({
    id: activity.id,
    title: activity.title,
    ownerLabel: activity.ownerLabel,
    statusLabel: activity.lifecycleStatusLabel,
    signupStatusLabel: activity.signupStatusLabel,
    signupMode: activity.signupMode,
    signupModeLabel: activity.signupMode === "GENERAL" ? "统一报名" : "按场地报名",
    venueLabel: activity.venueLabel,
    scheduleText: activity.scheduleText,
    chargeText: activity.chargeText,
    cancelDeadlineText: activity.cancelDeadlineText,
    descriptionRichtext: activity.descriptionRichtext,
    currentUserSignupLabel: activity.currentUserSignupLabel,
    canCancelCurrentUserRegistration: activity.canCancelCurrentUserRegistration,
    currentUserRegistrationId: activity.currentUserRegistrationId ?? "",
    isManageable: activity.isManageable,
    canManage: activity.isManageable && activity.status === "PUBLISHED" && !activity.isFinished,
    totalCapacity: activity.totalCapacity,
    totalCapacityText:
      activity.totalCapacity === null ? "按场地分配" : `${activity.confirmedCount}/${activity.totalCapacity} 已确认`,
    canGeneralSignUp:
      activity.signupMode === "GENERAL" &&
      activity.isSignupOpen &&
      !activity.currentUserRegistrationId,
    generalSignupButtonText:
      activity.totalCapacity !== null && activity.confirmedCount >= activity.totalCapacity
        ? "候补报名"
        : "报名活动",
    registrations: activity.registrations.map((registration) => ({
      registrationId: registration.registrationId,
      nickname: registration.nickname,
      tagText:
        registration.signupStatus === "WAITLIST"
          ? `候补 #${registration.queueNo ?? 1}`
          : SIGNUP_STATUS_LABELS[registration.signupStatus],
      isCurrentUser: registration.isCurrentUser,
    })),
    confirmedCount: activity.confirmedCount,
    waitlistCount: activity.waitlistCount,
    courts: activity.courts.map((court) => ({
      id: court.id,
      label: court.label,
      capacity: court.capacity,
      confirmedCount: court.confirmedCount,
      occupancyText: `${court.confirmedCount}/${court.capacity} 已确认`,
      waitlistText: `${court.waitlistCount} 候补`,
      signupButtonText: court.isFull ? "候补该场" : "报名该场",
      canSignup: activity.isSignupOpen,
      canDecreaseCapacity: court.confirmedCount < court.capacity,
      registrations: court.registrations.map((registration) => ({
        registrationId: registration.registrationId,
        nickname: registration.nickname,
        tagText:
          registration.signupStatus === "WAITLIST"
            ? `候补 #${registration.queueNo ?? 1}`
            : SIGNUP_STATUS_LABELS[registration.signupStatus],
        isCurrentUser: registration.isCurrentUser,
      })),
    })),
  }));
}

Page<ActivityPageData>({
  data: {
    activeSegment: "activities",
    activityCards: [],
    venues: [],
    currentUserName: "",
    currentUserInitial: "",
    currentUserAvatarColor: "#4C7CF0",
    currentUserRoleSummary: "",
    publishedCount: 0,
    manageableCount: 0,
    joinedCount: 0,
    capsuleStyle: "",
    contentStyle: "",
    headerStyle: "",
  },

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
    const currentUser = getCurrentUser();
    const ownerOptions = listOwnerOptions(CURRENT_USER_ID);
    const activities = listActivities(CURRENT_USER_ID);
    const stats = getActivityStats(CURRENT_USER_ID);

    this.setData({
      activityCards: mapActivitiesToCards(activities),
      venues: listVenues(),
      currentUserName: currentUser.nickname,
      currentUserInitial: currentUser.nickname.slice(0, 1),
      currentUserAvatarColor: currentUser.avatarColor,
      currentUserRoleSummary: ownerOptions.map((item) => item.label).join(" / "),
      publishedCount: stats.publishedCount,
      manageableCount: stats.manageableCount,
      joinedCount: stats.joinedCount,
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

  handleOpenCreate(): void {
    wx.navigateTo({
      url: "/pages/activity-create/index",
    });
  },

  handleRepublish(event: DatasetEvent): void {
    const activityId = event.currentTarget.dataset.activityId;

    if (typeof activityId !== "string" || activityId.length === 0) {
      return;
    }

    wx.navigateTo({
      url: `/pages/activity-create/index?sourceActivityId=${encodeURIComponent(activityId)}`,
    });
  },

  handleSignUp(event: DatasetEvent): void {
    const activityId = event.currentTarget.dataset.activityId;
    const activityCourtId = event.currentTarget.dataset.activityCourtId;

    if (typeof activityId !== "string") {
      return;
    }

    try {
      if (typeof activityCourtId === "string" && activityCourtId.length > 0) {
        signUpForCourt(activityId, activityCourtId, CURRENT_USER_ID);
      } else {
        signUpForActivity(activityId, CURRENT_USER_ID);
      }

      this.hydratePage();
      wx.showToast({
        title: "报名已提交",
        icon: "success",
      });
    } catch (error) {
      this.showError(error);
    }
  },

  handleCancelRegistration(event: DatasetEvent): void {
    const registrationId = event.currentTarget.dataset.registrationId;

    if (typeof registrationId !== "string" || registrationId.length === 0) {
      return;
    }

    try {
      cancelRegistration(registrationId, CURRENT_USER_ID);
      this.hydratePage();
      wx.showToast({
        title: "已取消报名",
        icon: "success",
      });
    } catch (error) {
      this.showError(error);
    }
  },

  handleAdjustCapacity(event: DatasetEvent): void {
    const activityCourtId = event.currentTarget.dataset.activityCourtId;
    const delta = Number(event.currentTarget.dataset.delta);
    const activityId = event.currentTarget.dataset.activityId;

    if (typeof activityCourtId !== "string" || typeof activityId !== "string") {
      return;
    }

    const activity = listActivities(CURRENT_USER_ID).find((item) => item.id === activityId);
    const court = activity?.courts.find((item) => item.id === activityCourtId);

    if (!activity || !court || !activity.canManage || Number.isNaN(delta)) {
      return;
    }

    try {
      updateActivityCourtCapacity(activityCourtId, court.capacity + delta, CURRENT_USER_ID);
      this.hydratePage();
    } catch (error) {
      this.showError(error);
    }
  },

  handleMoveRegistration(event: DatasetEvent): void {
    const activityId = event.currentTarget.dataset.activityId;
    const registrationId = event.currentTarget.dataset.registrationId;

    if (typeof activityId !== "string" || typeof registrationId !== "string") {
      return;
    }

    const activity = listActivities(CURRENT_USER_ID).find((item) => item.id === activityId);

    if (!activity || !activity.canManage) {
      return;
    }

    const targetCourts = activity.courts.filter((court) =>
      court.registrations.every((registration) => registration.registrationId !== registrationId)
    );

    if (targetCourts.length === 0) {
      wx.showToast({
        title: "没有可调入的其他场地",
        icon: "none",
      });
      return;
    }

    wx.showActionSheet({
      itemList: targetCourts.map(
        (court) => `${court.label} · ${court.confirmedCount}/${court.capacity}`
      ),
      success: (result) => {
        const targetCourt = targetCourts[result.tapIndex];

        if (!targetCourt) {
          return;
        }

        try {
          moveRegistration(registrationId, targetCourt.id, CURRENT_USER_ID);
          this.hydratePage();
          wx.showToast({
            title: "已调整场地",
            icon: "success",
          });
        } catch (error) {
          this.showError(error);
        }
      },
    });
  },

  showError(error: unknown): void {
    const title = error instanceof Error ? error.message : "操作失败，请稍后重试";

    wx.showToast({
      title,
      icon: "none",
    });
  },
});
