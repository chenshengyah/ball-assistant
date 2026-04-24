import { SIGNUP_MODE_LABELS } from "../../constants/activity";
import {
  cancelRegistration,
  getActivityById,
  moveRegistration,
  signUpForActivity,
  signUpForCourt,
  updateActivityCourtCapacity,
} from "../../services/activity-service";
import {
  getCurrentMockUserId,
  hasRequiredProfileForIntent,
  requireCompleteProfile,
} from "../../services/auth";
import { getPageTopStyle } from "../../utils/chrome";

type ActivityDetailRegistration = {
  isCurrentUser: boolean;
  nickname: string;
  registrationId: string;
  tagText: string;
};

type ActivityDetailCourt = {
  canDecreaseCapacity: boolean;
  canSignup: boolean;
  capacity: number;
  confirmedCount: number;
  id: string;
  label: string;
  occupancyText: string;
  registrations: ActivityDetailRegistration[];
  signupButtonText: string;
  waitlistText: string;
};

type ActivityDetailPageData = {
  activityId: string;
  activityStartAt: string;
  cancelDeadlineText: string;
  canCancelCurrentUserRegistration: boolean;
  canGeneralSignUp: boolean;
  canManage: boolean;
  chargeText: string;
  confirmedCount: number;
  courts: ActivityDetailCourt[];
  currentUserRegistrationId: string;
  currentUserSignupLabel: string;
  descriptionRichtext: string;
  generalSignupButtonText: string;
  isGuest: boolean;
  isMissing: boolean;
  ownerLabel: string;
  ownerContactName: string;
  ownerContactPhone: string;
  pendingActionType: string;
  pendingActivityCourtId: string;
  pendingRegistrationId: string;
  scheduleText: string;
  pageTopStyle: string;
  signupMode: string;
  signupModeLabel: string;
  signupStatusLabel: string;
  statusLabel: string;
  title: string;
  totalCapacityText: string;
  venueLabel: string;
  waitlistCount: number;
};

type DatasetEvent = WechatMiniprogram.BaseEvent<{
  activityCourtId?: string;
  delta?: number;
  registrationId?: string;
}>;

function buildRegistrationTag(signupStatus: string, queueNo?: number): string {
  if (signupStatus === "WAITLIST") {
    return `候补 #${queueNo ?? 1}`;
  }

  return signupStatus === "CONFIRMED" ? "已确认" : "已取消";
}

Page({
  data: {
    activityId: "",
    activityStartAt: "",
    cancelDeadlineText: "",
    canCancelCurrentUserRegistration: false,
    canGeneralSignUp: false,
    canManage: false,
    chargeText: "",
    confirmedCount: 0,
    courts: [],
    currentUserRegistrationId: "",
    currentUserSignupLabel: "",
    descriptionRichtext: "",
    generalSignupButtonText: "报名活动",
    isGuest: true,
    isMissing: false,
    ownerLabel: "",
    ownerContactName: "",
    ownerContactPhone: "",
    pendingActionType: "",
    pendingActivityCourtId: "",
    pendingRegistrationId: "",
    pageTopStyle: "",
    scheduleText: "",
    signupMode: "",
    signupModeLabel: "",
    signupStatusLabel: "",
    statusLabel: "",
    title: "",
    totalCapacityText: "",
    venueLabel: "",
    waitlistCount: 0,
  } as ActivityDetailPageData,

  onLoad(options: Record<string, string | undefined>): void {
    this.syncPageChrome();
    const activityId =
      typeof options.activityId === "string" && options.activityId.length > 0
        ? decodeURIComponent(options.activityId)
        : "";

    this.setData({
      activityId,
      pendingActionType:
        typeof options.pendingAction === "string" ? decodeURIComponent(options.pendingAction) : "",
      pendingActivityCourtId:
        typeof options.activityCourtId === "string"
          ? decodeURIComponent(options.activityCourtId)
          : "",
      pendingRegistrationId:
        typeof options.registrationId === "string"
          ? decodeURIComponent(options.registrationId)
          : "",
    });
  },

  onShow(): void {
    this.syncPageChrome();
    this.hydratePage();
    void this.tryResumePendingAction();
  },

  syncPageChrome(): void {
    this.setData({
      pageTopStyle: getPageTopStyle(16),
    });
  },

  hydratePage(): void {
    const currentUserId = getCurrentMockUserId();
    const activity = getActivityById(this.data.activityId, currentUserId);

    if (!activity) {
      this.setData({
        isMissing: true,
      });
      return;
    }

    this.setData({
      activityStartAt: activity.activityStartAt,
      cancelDeadlineText: activity.cancelDeadlineText,
      canCancelCurrentUserRegistration: activity.canCancelCurrentUserRegistration,
      canGeneralSignUp:
        activity.signupMode === "GENERAL" &&
        activity.isSignupOpen &&
        !activity.currentUserRegistrationId,
      canManage: activity.isManageable && activity.status === "PUBLISHED" && !activity.isFinished,
      chargeText: activity.chargeText,
      confirmedCount: activity.confirmedCount,
      courts: activity.courts.map((court) => ({
        canDecreaseCapacity: court.confirmedCount < court.capacity,
        canSignup: activity.isSignupOpen && !activity.currentUserRegistrationId,
        capacity: court.capacity,
        confirmedCount: court.confirmedCount,
        id: court.id,
        label: court.label,
        occupancyText: `${court.confirmedCount}/${court.capacity} 已确认`,
        registrations: court.registrations.map((registration) => ({
          isCurrentUser: registration.isCurrentUser,
          nickname: registration.nickname,
          registrationId: registration.registrationId,
          tagText: buildRegistrationTag(registration.signupStatus, registration.queueNo),
        })),
        signupButtonText: court.isFull ? "候补该场" : "报名该场",
        waitlistText: `${court.waitlistCount} 候补`,
      })),
      currentUserRegistrationId: activity.currentUserRegistrationId ?? "",
      currentUserSignupLabel: activity.currentUserSignupLabel,
      descriptionRichtext: activity.descriptionRichtext,
      generalSignupButtonText:
        activity.totalCapacity !== null && activity.confirmedCount >= activity.totalCapacity
          ? "候补报名"
          : "报名活动",
      isGuest: !currentUserId,
      isMissing: false,
      ownerLabel: activity.ownerLabel,
      ownerContactName: activity.ownerDisplay.contactName ?? "",
      ownerContactPhone:
        activity.ownerDisplay.contactPhoneMasked ?? activity.ownerDisplay.contactPhone ?? "",
      scheduleText: activity.scheduleText,
      signupMode: activity.signupMode,
      signupModeLabel: SIGNUP_MODE_LABELS[activity.signupMode],
      signupStatusLabel: activity.signupStatusLabel,
      statusLabel: activity.lifecycleStatusLabel,
      title: activity.title,
      totalCapacityText:
        activity.totalCapacity === null
          ? "按场地分配"
          : `${activity.confirmedCount}/${activity.totalCapacity} 已确认`,
      venueLabel: activity.venueLabel,
      waitlistCount: activity.waitlistCount,
    });
  },

  async tryResumePendingAction(): Promise<void> {
    if (!this.data.pendingActionType || !this.data.activityId) {
      return;
    }

    const pendingIntent =
      this.data.pendingActionType === "SIGN_UP_ACTIVITY"
        ? {
            type: "SIGN_UP_ACTIVITY" as const,
            activityId: this.data.activityId,
            activityCourtId: this.data.pendingActivityCourtId || undefined,
          }
        : this.data.pendingActionType === "CANCEL_SIGNUP" && this.data.pendingRegistrationId
          ? {
              type: "CANCEL_SIGNUP" as const,
              activityId: this.data.activityId,
              registrationId: this.data.pendingRegistrationId,
            }
          : null;

    if (!pendingIntent || !hasRequiredProfileForIntent(pendingIntent)) {
      return;
    }

    const currentUserId = getCurrentMockUserId();

    if (!currentUserId) {
      return;
    }

    try {
      if (this.data.pendingActionType === "SIGN_UP_ACTIVITY") {
        if (this.data.pendingActivityCourtId) {
          signUpForCourt(this.data.activityId, this.data.pendingActivityCourtId, currentUserId);
        } else {
          signUpForActivity(this.data.activityId, currentUserId);
        }

        wx.showToast({
          title: "报名已提交",
          icon: "success",
        });
      }

      if (this.data.pendingActionType === "CANCEL_SIGNUP" && this.data.pendingRegistrationId) {
        cancelRegistration(this.data.pendingRegistrationId, currentUserId);
        wx.showToast({
          title: "已取消报名",
          icon: "success",
        });
      }
    } catch (error) {
      const title = error instanceof Error ? error.message : "操作失败，请稍后重试";

      wx.showToast({
        title,
        icon: "none",
      });
    } finally {
      this.setData({
        pendingActionType: "",
        pendingActivityCourtId: "",
        pendingRegistrationId: "",
      });
      this.hydratePage();
    }
  },

  async handleSignUp(event: DatasetEvent): Promise<void> {
    const activityCourtId = event.currentTarget.dataset.activityCourtId;
    const canContinue = await requireCompleteProfile(
      typeof activityCourtId === "string" && activityCourtId.length > 0
        ? {
            type: "SIGN_UP_ACTIVITY",
            activityId: this.data.activityId,
            activityCourtId,
          }
        : {
            type: "SIGN_UP_ACTIVITY",
            activityId: this.data.activityId,
          }
    );

    if (!canContinue) {
      return;
    }

    const currentUserId = getCurrentMockUserId();

    if (!currentUserId) {
      return;
    }

    try {
      if (typeof activityCourtId === "string" && activityCourtId.length > 0) {
        signUpForCourt(this.data.activityId, activityCourtId, currentUserId);
      } else {
        signUpForActivity(this.data.activityId, currentUserId);
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

  async handleCancelSignup(): Promise<void> {
    if (!this.data.currentUserRegistrationId) {
      return;
    }

    const canContinue = await requireCompleteProfile({
      type: "CANCEL_SIGNUP",
      activityId: this.data.activityId,
      registrationId: this.data.currentUserRegistrationId,
    });

    if (!canContinue) {
      return;
    }

    const currentUserId = getCurrentMockUserId();

    if (!currentUserId) {
      return;
    }

    try {
      cancelRegistration(this.data.currentUserRegistrationId, currentUserId);
      this.hydratePage();
      wx.showToast({
        title: "已取消报名",
        icon: "success",
      });
    } catch (error) {
      this.showError(error);
    }
  },

  handleRepublish(): void {
    wx.navigateTo({
      url: `/pages/activity-create/index?sourceActivityId=${encodeURIComponent(this.data.activityId)}`,
    });
  },

  handleAdjustCapacity(event: DatasetEvent): void {
    const activityCourtId = event.currentTarget.dataset.activityCourtId;
    const delta = Number(event.currentTarget.dataset.delta);
    const currentUserId = getCurrentMockUserId();

    if (
      typeof activityCourtId !== "string" ||
      !currentUserId ||
      !this.data.canManage ||
      Number.isNaN(delta)
    ) {
      return;
    }

    const targetCourt = this.data.courts.find((court) => court.id === activityCourtId);

    if (!targetCourt) {
      return;
    }

    try {
      updateActivityCourtCapacity(activityCourtId, targetCourt.capacity + delta, currentUserId);
      this.hydratePage();
    } catch (error) {
      this.showError(error);
    }
  },

  handleMoveRegistration(event: DatasetEvent): void {
    const registrationId = event.currentTarget.dataset.registrationId;
    const currentUserId = getCurrentMockUserId();

    if (typeof registrationId !== "string" || !currentUserId || !this.data.canManage) {
      return;
    }

    const targetCourts = this.data.courts.filter((court) =>
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
          moveRegistration(registrationId, targetCourt.id, currentUserId);
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
