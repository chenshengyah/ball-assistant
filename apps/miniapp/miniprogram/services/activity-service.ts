import {
  CHARGE_MODE_OPTIONS,
  CLUB_ROLE_LABELS,
  OWNER_TYPE_LABELS,
  SIGNUP_MODE_LABELS,
  SIGNUP_STATUS_LABELS,
} from "../constants/activity";
import type {
  ActivityDraft,
  ActivitySignupMode,
  ActivityStatus,
  ActivityView,
  ChargeMode,
  CreateActivityInput,
  MyActivitiesView,
  OwnerDisplay,
  OwnerOption,
  OwnerType,
  SignupStatus,
  UserProfile,
} from "../types/activity";
import { getAccessToken, getAuthSnapshot } from "./auth";
import { requestApi } from "./api";
import { listOwnedClubs } from "./club-service";

type RegistrationApiItem = {
  registrationId: string;
  userId: string;
  nickname: string;
  avatarColor: string;
  signupStatus: SignupStatus;
  queueNo?: number;
  isCurrentUser: boolean;
};

type ActivityCourtApiItem = {
  id: string;
  venueCourtId?: string;
  label: string;
  code: string;
  capacity: number;
  confirmedCount: number;
  waitlistCount: number;
  isFull: boolean;
  registrations: RegistrationApiItem[];
};

type ActivityDetailApiItem = {
  activityId: string;
  id?: string;
  status: ActivityStatus;
  ownerType: OwnerType;
  ownerId: string;
  ownerLabel: string;
  ownerDisplay: OwnerDisplay;
  title: string;
  coverUrl?: string;
  chargeMode: ChargeMode;
  chargeAmountCents: number;
  chargeDesc?: string;
  venueSnapshotName: string;
  venueSnapshotAddress?: string;
  venueSnapshotProvince?: string;
  venueSnapshotCity?: string;
  venueSnapshotDistrict?: string;
  venueSnapshotLatitude?: number;
  venueSnapshotLongitude?: number;
  activityStartAt: string;
  activityEndAt: string;
  cancelDeadlineAt: string;
  cancelCutoffMinutesBeforeStart: number;
  descriptionRichtext?: string;
  signupMode: ActivitySignupMode;
  totalCapacity?: number | null;
  isSignupOpen: boolean;
  isFinished: boolean;
  isInProgress: boolean;
  isManageable: boolean;
  currentUserRegistrationId: string | null;
  currentUserSignupLabel: string;
  canCancelCurrentUserRegistration: boolean;
  confirmedCount: number;
  waitlistCount: number;
  courts: ActivityCourtApiItem[];
  registrations: RegistrationApiItem[];
};

type ActivityListApiItem = {
  activityId: string;
  title: string;
  ownerType: OwnerType;
  ownerLabel: string;
  coverUrl?: string;
  venueSnapshotName: string;
  activityStartAt: string;
  activityEndAt: string;
  chargeMode: ChargeMode;
  chargeAmountCents: number;
  chargeDesc?: string;
  confirmedCount: number;
  waitlistCount: number;
};

function getAuthHeaders(optional = false): Record<string, string> | undefined {
  const accessToken = getAccessToken();

  if (!accessToken) {
    if (optional) {
      return undefined;
    }

    throw new Error("请先登录后再继续");
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

function formatTime(date: Date): string {
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${hour}:${minute}`;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDisplayDateTime(dateTime: string): string {
  const date = new Date(dateTime);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${month}/${day} ${formatTime(date)}`;
}

function formatCutoffLabel(cancelCutoffMinutesBeforeStart: number): string {
  if (cancelCutoffMinutesBeforeStart % 60 === 0) {
    return `活动前 ${cancelCutoffMinutesBeforeStart / 60} 小时`;
  }

  return `活动前 ${cancelCutoffMinutesBeforeStart} 分钟`;
}

function getChargeText(activity: Pick<ActivityDetailApiItem | ActivityListApiItem, "chargeMode" | "chargeAmountCents" | "chargeDesc">): string {
  if (activity.chargeMode === "FREE") {
    return "免费";
  }

  if (activity.chargeMode === "OTHER") {
    return activity.chargeDesc || "其他收费";
  }

  const amount = activity.chargeAmountCents / 100;
  const chargeModeLabel =
    CHARGE_MODE_OPTIONS.find((item) => item.value === activity.chargeMode)?.label ?? "收费";

  return `${chargeModeLabel} ¥${amount.toFixed(0)}`;
}

function getLifecycleStatusLabel(activity: ActivityDetailApiItem): string {
  if (activity.status === "CANCELLED") {
    return "已取消";
  }

  if (activity.status === "DRAFT") {
    return "草稿";
  }

  if (activity.isFinished) {
    return "已结束";
  }

  if (activity.isInProgress) {
    return "进行中";
  }

  return "已发布";
}

function getSignupStatusLabel(activity: ActivityDetailApiItem): string {
  if (activity.status === "CANCELLED") {
    return "已取消";
  }

  if (activity.status === "DRAFT") {
    return "未发布";
  }

  if (activity.isFinished) {
    return "已结束";
  }

  if (activity.isInProgress) {
    return "进行中";
  }

  return activity.isSignupOpen ? "报名中" : "报名截止";
}

function toActivityListView(activity: ActivityListApiItem): ActivityView {
  const startAt = new Date(activity.activityStartAt);
  const endAt = new Date(activity.activityEndAt);

  return {
    id: activity.activityId,
    title: activity.title,
    ownerLabel: activity.ownerLabel,
    ownerType: activity.ownerType,
    ownerDisplay: {
      mode: activity.ownerType,
      name: activity.ownerLabel,
    },
    coverUrl: activity.coverUrl ?? "",
    signupMode: "GENERAL",
    venueLabel: activity.venueSnapshotName,
    chargeText: getChargeText(activity),
    lifecycleStatusLabel: "",
    signupStatusLabel: "",
    isSignupOpen: false,
    isInProgress: false,
    isFinished: false,
    scheduleText: `${formatDisplayDateTime(activity.activityStartAt)} - ${formatTime(endAt)}`,
    cancelDeadlineText: "",
    descriptionRichtext: "",
    status: "PUBLISHED",
    isManageable: false,
    currentUserRegistrationId: null,
    currentUserSignupLabel: "未报名",
    canCancelCurrentUserRegistration: false,
    totalCapacity: null,
    courts: [],
    registrations: [],
    confirmedCount: activity.confirmedCount,
    waitlistCount: activity.waitlistCount,
    activityStartAt: startAt.toISOString(),
  };
}

function toActivityDetailView(activity: ActivityDetailApiItem): ActivityView {
  const startAt = new Date(activity.activityStartAt);
  const endAt = new Date(activity.activityEndAt);

  return {
    id: activity.activityId || activity.id || "",
    title: activity.title,
    ownerLabel: activity.ownerLabel,
    ownerType: activity.ownerType,
    ownerDisplay: activity.ownerDisplay,
    coverUrl: activity.coverUrl ?? "",
    signupMode: activity.signupMode,
    venueLabel: activity.venueSnapshotName,
    chargeText: getChargeText(activity),
    lifecycleStatusLabel: getLifecycleStatusLabel(activity),
    signupStatusLabel: getSignupStatusLabel(activity),
    isSignupOpen: activity.isSignupOpen,
    isInProgress: activity.isInProgress,
    isFinished: activity.isFinished,
    scheduleText: `${formatDisplayDateTime(activity.activityStartAt)} - ${formatTime(endAt)}`,
    cancelDeadlineText: `${formatDisplayDateTime(activity.cancelDeadlineAt)} · ${formatCutoffLabel(activity.cancelCutoffMinutesBeforeStart)}`,
    descriptionRichtext: activity.descriptionRichtext ?? "",
    status: activity.status,
    isManageable: activity.isManageable,
    currentUserRegistrationId: activity.currentUserRegistrationId,
    currentUserSignupLabel: activity.currentUserSignupLabel,
    canCancelCurrentUserRegistration: activity.canCancelCurrentUserRegistration,
    totalCapacity: activity.totalCapacity ?? null,
    courts: activity.courts,
    registrations: activity.registrations,
    confirmedCount: activity.confirmedCount,
    waitlistCount: activity.waitlistCount,
    activityStartAt: startAt.toISOString(),
  };
}

function toActivityDraft(activity: ActivityDetailApiItem, currentUserId: string): ActivityDraft {
  const startAt = new Date(activity.activityStartAt);
  const endAt = new Date(activity.activityEndAt);
  const ownerOptions = listOwnerOptions(currentUserId);
  const matchedOwner = ownerOptions.find(
    (option) => option.ownerType === activity.ownerType && option.ownerId === activity.ownerId
  );
  const fallbackOwner = matchedOwner ?? ownerOptions[0];

  if (!fallbackOwner) {
    throw new Error("当前没有可用发布身份");
  }

  return {
    sourceActivityId: activity.activityId,
    ownerType: fallbackOwner.ownerType,
    ownerId: fallbackOwner.ownerId,
    coverUrl: activity.coverUrl ?? "",
    signupMode: activity.signupMode,
    title: `${activity.title} · 再次发布`,
    chargeMode: activity.chargeMode,
    chargeAmountCents: activity.chargeAmountCents,
    chargeDesc: activity.chargeDesc ?? "",
    venueName: activity.venueSnapshotName,
    venueAddress: activity.venueSnapshotAddress ?? "",
    venueProvince: activity.venueSnapshotProvince ?? "",
    venueCity: activity.venueSnapshotCity ?? "",
    venueDistrict: activity.venueSnapshotDistrict ?? "",
    venueLatitude: activity.venueSnapshotLatitude,
    venueLongitude: activity.venueSnapshotLongitude,
    activityDate: formatDate(startAt),
    startTime: formatTime(startAt),
    endTime: formatTime(endAt),
    cancelCutoffMinutesBeforeStart: activity.cancelCutoffMinutesBeforeStart,
    descriptionRichtext: activity.descriptionRichtext ?? "",
    totalCapacity: activity.totalCapacity ?? undefined,
    courts:
      activity.signupMode === "USER_SELECT_COURT"
        ? activity.courts.map((court, index) => ({
            courtName: court.label,
            capacity: court.capacity,
            sortOrder: index + 1,
            label: court.label,
          }))
        : [],
  };
}

export function getCurrentUser(): UserProfile | null {
  const authSnapshot = getAuthSnapshot();
  const user = authSnapshot.user;

  if (!user) {
    return null;
  }

  return {
    id: user.userId,
    nickname: user.nickname || "当前用户",
    gender: user.gender || "MALE",
    avatarUrl: user.avatarUrl,
    avatarColor: user.avatarColor || "#4C7CF0",
    phoneNumber: user.phoneNumber,
    phoneCountryCode: user.phoneCountryCode,
    phoneVerifiedAt: user.phoneVerifiedAt,
    baseProfileComplete: user.baseProfileComplete,
    contactProfileComplete: user.contactProfileComplete,
  };
}

export function listOwnerOptions(currentUserId: string): OwnerOption[] {
  const authSnapshot = getAuthSnapshot();
  const personalOption: OwnerOption = {
    key: `PERSONAL:${currentUserId}`,
    ownerType: "PERSONAL",
    ownerId: currentUserId,
    label: `${OWNER_TYPE_LABELS.PERSONAL} · ${authSnapshot.user?.nickname || "我"}`,
  };
  const clubOptions = listOwnedClubs(currentUserId).map((club) => ({
    key: `CLUB:${club.id}`,
    ownerType: "CLUB" as const,
    ownerId: club.id,
    label: `${club.name || "俱乐部"} · ${CLUB_ROLE_LABELS.OWNER}`,
  }));

  return [personalOption, ...clubOptions];
}

export async function fetchActivities(): Promise<ActivityView[]> {
  const response = await requestApi<ActivityListApiItem[]>({
    path: "/activities",
  });

  return response.map(toActivityListView);
}

export async function createActivity(input: CreateActivityInput): Promise<ActivityView> {
  const response = await requestApi<ActivityDetailApiItem>({
    path: "/activities",
    method: "POST",
    data: {
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      coverUrl: input.coverUrl ?? "",
      title: input.title,
      chargeMode: input.chargeMode,
      chargeAmountCents: input.chargeAmountCents,
      chargeDesc: input.chargeDesc,
      venueName: input.venueName,
      venueAddress: input.venueAddress,
      venueProvince: input.venueProvince,
      venueCity: input.venueCity,
      venueDistrict: input.venueDistrict,
      venueLatitude: input.venueLatitude,
      venueLongitude: input.venueLongitude,
      signupMode: input.signupMode,
      activityDate: input.activityDate,
      startTime: input.startTime,
      endTime: input.endTime,
      cancelCutoffMinutesBeforeStart: input.cancelCutoffMinutesBeforeStart,
      descriptionRichtext: input.descriptionRichtext,
      totalCapacity: input.totalCapacity,
      courts: input.courts,
    },
    headers: getAuthHeaders(),
  });

  return toActivityDetailView(response);
}

export async function buildRepublishDraft(
  activityId: string,
  currentUserId: string
): Promise<ActivityDraft> {
  const response = await requestApi<ActivityDetailApiItem>({
    path: `/activities/${encodeURIComponent(activityId)}`,
    headers: getAuthHeaders(true),
  });

  return toActivityDraft(response, currentUserId);
}

export async function getActivityById(activityId: string): Promise<ActivityView | null> {
  try {
    const response = await requestApi<ActivityDetailApiItem>({
      path: `/activities/${encodeURIComponent(activityId)}`,
      headers: getAuthHeaders(true),
    });

    return toActivityDetailView(response);
  } catch {
    return null;
  }
}

export async function signUpForCourt(
  activityId: string,
  activityCourtId: string
): Promise<ActivityView> {
  const response = await requestApi<ActivityDetailApiItem>({
    path: `/activities/${encodeURIComponent(activityId)}/signups`,
    method: "POST",
    data: {
      activityCourtId,
    },
    headers: getAuthHeaders(),
  });

  return toActivityDetailView(response);
}

export async function signUpForActivity(activityId: string): Promise<ActivityView> {
  const response = await requestApi<ActivityDetailApiItem>({
    path: `/activities/${encodeURIComponent(activityId)}/signups`,
    method: "POST",
    data: {},
    headers: getAuthHeaders(),
  });

  return toActivityDetailView(response);
}

export async function cancelRegistration(registrationId: string): Promise<ActivityView> {
  const response = await requestApi<ActivityDetailApiItem>({
    path: `/activities/signups/${encodeURIComponent(registrationId)}/cancel`,
    method: "POST",
    headers: getAuthHeaders(),
  });

  return toActivityDetailView(response);
}

export async function moveRegistration(
  registrationId: string,
  toActivityCourtId: string
): Promise<ActivityView> {
  const response = await requestApi<ActivityDetailApiItem>({
    path: `/activities/signups/${encodeURIComponent(registrationId)}/court`,
    method: "PUT",
    data: {
      activityCourtId: toActivityCourtId,
    },
    headers: getAuthHeaders(),
  });

  return toActivityDetailView(response);
}

export async function updateActivityCourtCapacity(
  activityCourtId: string,
  nextCapacity: number
): Promise<ActivityView> {
  const response = await requestApi<ActivityDetailApiItem>({
    path: `/activities/courts/${encodeURIComponent(activityCourtId)}/capacity`,
    method: "PUT",
    data: {
      capacity: nextCapacity,
    },
    headers: getAuthHeaders(),
  });

  return toActivityDetailView(response);
}

export async function listMyActivities(): Promise<MyActivitiesView> {
  const response = await requestApi<{
    published: ActivityDetailApiItem[];
    joined: ActivityDetailApiItem[];
  }>({
    path: "/activities/my",
    headers: getAuthHeaders(),
  });

  return {
    published: response.published.map(toActivityDetailView),
    joined: response.joined.map(toActivityDetailView),
  };
}

export function getSignupModeLabel(signupMode: ActivitySignupMode): string {
  return SIGNUP_MODE_LABELS[signupMode];
}

export function getSignupStatusLabelText(signupStatus: SignupStatus): string {
  return SIGNUP_STATUS_LABELS[signupStatus];
}
