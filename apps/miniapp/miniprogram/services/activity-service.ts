import {
  CHARGE_MODE_OPTIONS,
  CLUB_ROLE_LABELS,
  OWNER_TYPE_LABELS,
  SIGNUP_STATUS_LABELS,
} from "../constants/activity";
import type {
  Activity,
  ActivityCourt,
  ActivityDraft,
  ActivityView,
  ClubMember,
  CreateActivityInput,
  OwnerOption,
  Registration,
  RegistrationLog,
  SignupStatus,
  UserProfile,
  MyActivitiesView,
} from "../types/activity";
import { getAuthSnapshot, getCurrentMockUserId } from "./auth";
import { getActivityStore } from "./activity-store";
import { createId } from "./id";

const MANAGEABLE_ROLES = new Set(["OWNER", "ADMIN"]);

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTime(date: Date): string {
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${hour}:${minute}`;
}

function formatDisplayDateTime(dateTime: string): string {
  const date = new Date(dateTime);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${month}/${day} ${formatTime(date)}`;
}

function joinDateTime(date: string, time: string): string {
  return `${date}T${time}:00+08:00`;
}

function getCancelDeadlineAt(
  activityStartAt: string,
  cancelCutoffMinutesBeforeStart: number
): string {
  const startAt = new Date(activityStartAt);
  const cancelDeadline = new Date(
    startAt.getTime() - cancelCutoffMinutesBeforeStart * 60 * 1000
  );

  return cancelDeadline.toISOString();
}

function formatCutoffLabel(cancelCutoffMinutesBeforeStart: number): string {
  if (cancelCutoffMinutesBeforeStart % 60 === 0) {
    return `活动前 ${cancelCutoffMinutesBeforeStart / 60} 小时`;
  }

  return `活动前 ${cancelCutoffMinutesBeforeStart} 分钟`;
}

function isActivityFinished(activity: Activity, currentTime: Date): boolean {
  return (
    activity.status === "PUBLISHED" &&
    new Date(activity.activityEndAt).getTime() <= currentTime.getTime()
  );
}

function isActivityInProgress(activity: Activity, currentTime: Date): boolean {
  return (
    activity.status === "PUBLISHED" &&
    new Date(activity.activityStartAt).getTime() <= currentTime.getTime() &&
    new Date(activity.activityEndAt).getTime() > currentTime.getTime()
  );
}

function getLifecycleStatusLabel(activity: Activity, currentTime: Date): string {
  if (activity.status === "CANCELLED") {
    return "已取消";
  }

  if (activity.status === "DRAFT") {
    return "草稿";
  }

  if (isActivityFinished(activity, currentTime)) {
    return "已结束";
  }

  if (isActivityInProgress(activity, currentTime)) {
    return "进行中";
  }

  return "已发布";
}

function getSignupStatusLabel(activity: Activity, currentTime: Date): string {
  if (activity.status === "CANCELLED") {
    return "已取消";
  }

  if (activity.status === "DRAFT") {
    return "未发布";
  }

  if (isActivityFinished(activity, currentTime)) {
    return "已结束";
  }

  if (isActivityInProgress(activity, currentTime)) {
    return "进行中";
  }

  const cancelDeadline = new Date(activity.cancelDeadlineAt);

  return cancelDeadline.getTime() > currentTime.getTime() ? "报名中" : "报名截止";
}

function isSignupOpen(activity: Activity, currentTime: Date): boolean {
  return (
    activity.status === "PUBLISHED" &&
    new Date(activity.activityStartAt).getTime() > currentTime.getTime() &&
    new Date(activity.activityEndAt).getTime() > currentTime.getTime() &&
    new Date(activity.cancelDeadlineAt).getTime() > currentTime.getTime()
  );
}

function getStartAndEnd(dateTime: string): {
  activityDate: string;
  time: string;
} {
  const date = new Date(dateTime);

  return {
    activityDate: formatDate(date),
    time: formatTime(date),
  };
}

function getChargeText(activity: Activity): string {
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

function getOwnerLabel(
  activity: Activity,
  memberships: ClubMember[],
  currentUserId: string
): string {
  const store = getActivityStore();

  if (activity.ownerType === "PERSONAL") {
    const owner = store.users.find((user) => user.id === activity.ownerId);

    return owner?.nickname
      ? `${OWNER_TYPE_LABELS.PERSONAL} · ${owner.nickname}`
      : OWNER_TYPE_LABELS.PERSONAL;
  }

  const club = store.clubs.find((item) => item.id === activity.ownerId);
  const currentMembership = memberships.find(
    (item) => item.clubId === activity.ownerId && item.userId === currentUserId
  );
  const roleSuffix = currentMembership ? ` · ${CLUB_ROLE_LABELS[currentMembership.role]}` : "";

  return `${club?.name ?? "俱乐部"}${roleSuffix}`;
}

function getManageable(activity: Activity, currentUserId: string): boolean {
  const store = getActivityStore();

  if (activity.ownerType === "PERSONAL") {
    return activity.createdBy === currentUserId;
  }

  const membership = store.clubMembers.find(
    (item) => item.clubId === activity.ownerId && item.userId === currentUserId
  );

  return Boolean(membership && MANAGEABLE_ROLES.has(membership.role));
}

function getActiveRegistrations(activityId: string): Registration[] {
  return getActivityStore().registrations.filter(
    (registration) =>
      registration.activityId === activityId && registration.signupStatus !== "CANCELLED"
  );
}

function getScopedRegistrations(
  activityId: string,
  activityCourtId: string | null
): Registration[] {
  return getActiveRegistrations(activityId).filter((registration) =>
    activityCourtId ? registration.activityCourtId === activityCourtId : !registration.activityCourtId
  );
}

function renumberWaitlist(activityId: string, activityCourtId: string | null): void {
  const waitlistRegistrations = getScopedRegistrations(activityId, activityCourtId)
    .filter((registration) => registration.signupStatus === "WAITLIST")
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  waitlistRegistrations.forEach((registration, index) => {
    registration.queueNo = index + 1;
  });
}

function promoteWaitlist(activity: Activity, activityCourtId: string | null): void {
  const store = getActivityStore();
  const capacity =
    activityCourtId === null
      ? activity.totalCapacity ?? 0
      : store.activityCourts.find((item) => item.id === activityCourtId)?.capacity ?? 0;

  if (capacity < 1) {
    return;
  }

  let confirmedCount = getScopedRegistrations(activity.id, activityCourtId).filter(
    (registration) => registration.signupStatus === "CONFIRMED"
  ).length;

  while (confirmedCount < capacity) {
    const waitlistRegistration = getScopedRegistrations(activity.id, activityCourtId)
      .filter((registration) => registration.signupStatus === "WAITLIST")
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0];

    if (!waitlistRegistration) {
      break;
    }

    waitlistRegistration.signupStatus = "CONFIRMED";
    delete waitlistRegistration.queueNo;
    confirmedCount += 1;
  }

  renumberWaitlist(activity.id, activityCourtId);
}

function logRegistrationAction(log: Omit<RegistrationLog, "id" | "createdAt">): void {
  const store = getActivityStore();

  store.registrationLogs.push({
    ...log,
    id: createId("registration-log"),
    createdAt: new Date().toISOString(),
  });
}

function toRegistrationMemberView(
  registration: Registration,
  currentUserId: string
): ActivityView["registrations"][number] {
  const user = getActivityStore().users.find((item) => item.id === registration.userId);

  return {
    registrationId: registration.id,
    userId: registration.userId,
    nickname: user?.nickname ?? "未知用户",
    avatarColor: user?.avatarColor ?? "#C7D2FE",
    signupStatus: registration.signupStatus,
    queueNo: registration.queueNo,
    isCurrentUser: registration.userId === currentUserId,
  };
}

function toActivityView(activity: Activity, currentUserId: string): ActivityView {
  const store = getActivityStore();
  const venue = store.venues.find((item) => item.id === activity.venueId);
  const memberships = store.clubMembers;
  const activityCourts =
    activity.signupMode === "USER_SELECT_COURT"
      ? store.activityCourts
          .filter((item) => item.activityId === activity.id && item.status === "ACTIVE")
          .sort((left, right) => left.sortOrder - right.sortOrder)
      : [];
  const activeRegistrations = getActiveRegistrations(activity.id);

  const courts = activityCourts.map((court) => {
    const registrations = activeRegistrations
      .filter((registration) => registration.activityCourtId === court.id)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    const confirmedCount = registrations.filter(
      (registration) => registration.signupStatus === "CONFIRMED"
    ).length;
    const waitlistCount = registrations.filter(
      (registration) => registration.signupStatus === "WAITLIST"
    ).length;

    return {
      id: court.id,
      venueCourtId: court.venueCourtId,
      label: court.courtNameSnapshot,
      code: court.courtCodeSnapshot,
      capacity: court.capacity,
      confirmedCount,
      waitlistCount,
      isFull: confirmedCount >= court.capacity,
      registrations: registrations.map((registration) =>
        toRegistrationMemberView(registration, currentUserId)
      ),
    };
  });
  const registrations =
    activity.signupMode === "GENERAL"
      ? activeRegistrations
          .slice()
          .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
          .map((registration) => toRegistrationMemberView(registration, currentUserId))
      : [];
  const currentUserRegistration = activeRegistrations.find(
    (registration) => registration.userId === currentUserId
  );
  const confirmedCount = activeRegistrations.filter(
    (registration) => registration.signupStatus === "CONFIRMED"
  ).length;
  const waitlistCount = activeRegistrations.filter(
    (registration) => registration.signupStatus === "WAITLIST"
  ).length;
  const startAt = new Date(activity.activityStartAt);
  const endAt = new Date(activity.activityEndAt);
  const cancelDeadline = new Date(activity.cancelDeadlineAt);
  const currentTime = new Date();
  const isInProgress = isActivityInProgress(activity, currentTime);
  const isFinished = isActivityFinished(activity, currentTime);
  const lifecycleStatusLabel = getLifecycleStatusLabel(activity, currentTime);
  const signupStatusLabel = getSignupStatusLabel(activity, currentTime);
  const signupOpen = isSignupOpen(activity, currentTime);
  const currentCourt =
    activity.signupMode === "USER_SELECT_COURT" && currentUserRegistration?.activityCourtId
      ? courts.find((court) => court.id === currentUserRegistration.activityCourtId)
      : null;
  const currentUserSignupLabel =
    currentUserId.length === 0
      ? "登录后可报名"
      : currentUserRegistration
        ? activity.signupMode === "USER_SELECT_COURT"
          ? `${currentCourt?.label ?? "场地"} · ${SIGNUP_STATUS_LABELS[currentUserRegistration.signupStatus]}`
          : `统一报名 · ${SIGNUP_STATUS_LABELS[currentUserRegistration.signupStatus]}`
        : "未报名";

  return {
    id: activity.id,
    title: activity.title,
    ownerLabel: getOwnerLabel(activity, memberships, currentUserId),
    ownerType: activity.ownerType,
    signupMode: activity.signupMode,
    venueLabel: venue?.name ?? activity.venueSnapshotName,
    chargeText: getChargeText(activity),
    lifecycleStatusLabel,
    signupStatusLabel,
    isSignupOpen: signupOpen,
    isInProgress,
    isFinished,
    scheduleText: `${formatDisplayDateTime(activity.activityStartAt)} - ${formatTime(endAt)}`,
    cancelDeadlineText: `${formatDisplayDateTime(activity.cancelDeadlineAt)} · ${formatCutoffLabel(activity.cancelCutoffMinutesBeforeStart)}`,
    descriptionRichtext: activity.descriptionRichtext,
    status: activity.status,
    isManageable: getManageable(activity, currentUserId),
    currentUserRegistrationId: currentUserRegistration?.id ?? null,
    currentUserSignupLabel,
    canCancelCurrentUserRegistration:
      Boolean(currentUserRegistration) &&
      activity.status === "PUBLISHED" &&
      startAt.getTime() > currentTime.getTime() &&
      endAt.getTime() > currentTime.getTime() &&
      cancelDeadline.getTime() > currentTime.getTime(),
    totalCapacity: activity.totalCapacity ?? null,
    courts,
    registrations,
    confirmedCount,
    waitlistCount,
    activityStartAt: startAt.toISOString(),
  };
}

export function getCurrentUser(): UserProfile | null {
  const currentUserId = getCurrentMockUserId();

  if (!currentUserId) {
    return null;
  }

  const authSnapshot = getAuthSnapshot();
  const storeUser = getActivityStore().users.find((user) => user.id === currentUserId);

  return {
    id: currentUserId,
    nickname: authSnapshot.user?.nickname || storeUser?.nickname || "当前用户",
    gender: authSnapshot.user?.gender || storeUser?.gender || "MALE",
    avatarColor: authSnapshot.user?.avatarColor || storeUser?.avatarColor || "#4C7CF0",
  };
}

export function listOwnerOptions(currentUserId: string): OwnerOption[] {
  const store = getActivityStore();
  const currentUser = store.users.find((user) => user.id === currentUserId);
  const personalOption: OwnerOption = {
    key: `PERSONAL:${currentUserId}`,
    ownerType: "PERSONAL",
    ownerId: currentUserId,
    label: `${OWNER_TYPE_LABELS.PERSONAL} · ${currentUser?.nickname ?? "我"}`,
  };
  const clubOptions = store.clubMembers
    .filter((member) => member.userId === currentUserId && MANAGEABLE_ROLES.has(member.role))
    .map((member) => {
      const club = store.clubs.find((item) => item.id === member.clubId);

      return {
        key: `CLUB:${member.clubId}`,
        ownerType: "CLUB" as const,
        ownerId: member.clubId,
        label: `${club?.name ?? "俱乐部"} · ${CLUB_ROLE_LABELS[member.role]}`,
      };
    });

  return [personalOption, ...clubOptions];
}

export function listActivities(currentUserId?: string | null): ActivityView[] {
  const resolvedCurrentUserId = currentUserId ?? "";

  return getActivityStore()
    .activities.slice()
    .sort((left, right) => left.activityStartAt.localeCompare(right.activityStartAt))
    .map((activity) => toActivityView(activity, resolvedCurrentUserId));
}

export function createActivity(input: CreateActivityInput): ActivityView {
  const store = getActivityStore();
  const venue = store.venues.find((item) => item.id === input.venueId);

  if (!venue) {
    throw new Error("请选择有效场馆");
  }

  if (!input.title.trim()) {
    throw new Error("请填写活动名称");
  }

  if (input.signupMode === "USER_SELECT_COURT" && input.courts.length === 0) {
    throw new Error("请至少启用一片场地");
  }

  if (
    input.signupMode === "GENERAL" &&
    (!Number.isFinite(input.totalCapacity) || Number(input.totalCapacity) < 1)
  ) {
    throw new Error("活动总人数至少为 1");
  }

  const startAt = new Date(joinDateTime(input.activityDate, input.startTime));
  const endAt = new Date(joinDateTime(input.activityDate, input.endTime));
  const cancelAt = new Date(
    getCancelDeadlineAt(
      joinDateTime(input.activityDate, input.startTime),
      input.cancelCutoffMinutesBeforeStart
    )
  );

  if (endAt.getTime() <= startAt.getTime()) {
    throw new Error("结束时间需要晚于开始时间");
  }

  if (cancelAt.getTime() > startAt.getTime()) {
    throw new Error("停止取消时间不能晚于活动开始时间");
  }

  const activityId = createId("activity");
  const activity: Activity = {
    id: activityId,
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    createdBy: input.createdBy,
    title: input.title.trim(),
    chargeMode: input.chargeMode,
    chargeAmountCents: input.chargeAmountCents,
    chargeDesc: input.chargeDesc.trim(),
    venueId: input.venueId,
    venueSnapshotName: venue.name,
    activityStartAt: joinDateTime(input.activityDate, input.startTime),
    activityEndAt: joinDateTime(input.activityDate, input.endTime),
    cancelCutoffMinutesBeforeStart: input.cancelCutoffMinutesBeforeStart,
    cancelDeadlineAt: getCancelDeadlineAt(
      joinDateTime(input.activityDate, input.startTime),
      input.cancelCutoffMinutesBeforeStart
    ),
    descriptionRichtext: input.descriptionRichtext.trim(),
    signupMode: input.signupMode,
    totalCapacity: input.signupMode === "GENERAL" ? input.totalCapacity : undefined,
    status: "PUBLISHED",
  };
  const activityCourts: ActivityCourt[] =
    input.signupMode === "USER_SELECT_COURT"
      ? input.courts.map((court) => {
          const venueCourt = store.venueCourts.find((item) => item.id === court.venueCourtId);

          if (!venueCourt) {
            throw new Error("存在无效场地，请刷新后重试");
          }

          return {
            id: createId("activity-court"),
            activityId,
            venueCourtId: court.venueCourtId,
            courtCodeSnapshot: venueCourt.courtCode,
            courtNameSnapshot: venueCourt.courtName,
            capacity: court.capacity,
            sortOrder: court.sortOrder,
            status: "ACTIVE",
          };
        })
      : [];

  store.activities.unshift(activity);
  if (activityCourts.length > 0) {
    store.activityCourts.push(...activityCourts);
  }

  return toActivityView(activity, input.createdBy);
}

export function buildRepublishDraft(activityId: string, currentUserId: string): ActivityDraft {
  const store = getActivityStore();
  const activity = store.activities.find((item) => item.id === activityId);

  if (!activity) {
    throw new Error("活动不存在");
  }

  const ownerOptions = listOwnerOptions(currentUserId);
  const fallbackOwner = ownerOptions[0];
  const startAt = getStartAndEnd(activity.activityStartAt);
  const endAt = getStartAndEnd(activity.activityEndAt);
  const matchedOwner = ownerOptions.find(
    (option) => option.ownerType === activity.ownerType && option.ownerId === activity.ownerId
  );

  return {
    sourceActivityId: activity.id,
    ownerType: matchedOwner?.ownerType ?? fallbackOwner.ownerType,
    ownerId: matchedOwner?.ownerId ?? fallbackOwner.ownerId,
    signupMode: activity.signupMode,
    title: `${activity.title} · 再次发布`,
    chargeMode: activity.chargeMode,
    chargeAmountCents: activity.chargeAmountCents,
    chargeDesc: activity.chargeDesc,
    venueId: activity.venueId,
    activityDate: startAt.activityDate,
    startTime: startAt.time,
    endTime: endAt.time,
    cancelCutoffMinutesBeforeStart: activity.cancelCutoffMinutesBeforeStart,
    descriptionRichtext: activity.descriptionRichtext,
    totalCapacity: activity.totalCapacity,
    courts:
      activity.signupMode === "USER_SELECT_COURT"
        ? store.activityCourts
            .filter((item) => item.activityId === activity.id)
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .map((court) => ({
              venueCourtId: court.venueCourtId,
              capacity: court.capacity,
              sortOrder: court.sortOrder,
              label: court.courtNameSnapshot,
            }))
        : [],
  };
}

export function signUpForCourt(
  activityId: string,
  activityCourtId: string,
  userId: string
): ActivityView {
  const store = getActivityStore();
  const activity = store.activities.find((item) => item.id === activityId);
  const court = store.activityCourts.find(
    (item) => item.id === activityCourtId && item.activityId === activityId
  );

  if (!activity || !court || activity.signupMode !== "USER_SELECT_COURT") {
    throw new Error("活动或场地不存在");
  }

  if (!isSignupOpen(activity, new Date())) {
    throw new Error("当前活动已截止报名");
  }

  const currentRegistration = getActiveRegistrations(activityId).find(
    (registration) => registration.userId === userId
  );

  if (currentRegistration) {
    throw new Error("你已经报过这个活动了");
  }

  const courtRegistrations = getScopedRegistrations(activityId, activityCourtId);
  const confirmedCount = courtRegistrations.filter(
    (registration) => registration.signupStatus === "CONFIRMED"
  ).length;
  const waitlistCount = courtRegistrations.filter(
    (registration) => registration.signupStatus === "WAITLIST"
  ).length;

  const signupStatus: SignupStatus = confirmedCount >= court.capacity ? "WAITLIST" : "CONFIRMED";
  const registration: Registration = {
    id: createId("registration"),
    activityId,
    userId,
    activityCourtId,
    signupStatus,
    queueNo: signupStatus === "WAITLIST" ? waitlistCount + 1 : undefined,
    createdAt: new Date().toISOString(),
  };

  store.registrations.push(registration);
  logRegistrationAction({
    activityId,
    registrationId: registration.id,
    action: "REGISTRATION_CREATED",
    operatorId: userId,
    toActivityCourtId: activityCourtId,
    detail: `报名到 ${court.courtNameSnapshot}，状态：${SIGNUP_STATUS_LABELS[signupStatus]}`,
  });

  return toActivityView(activity, userId);
}

export function signUpForActivity(activityId: string, userId: string): ActivityView {
  const store = getActivityStore();
  const activity = store.activities.find((item) => item.id === activityId);

  if (!activity || activity.signupMode !== "GENERAL") {
    throw new Error("活动不存在");
  }

  if (!isSignupOpen(activity, new Date())) {
    throw new Error("当前活动已截止报名");
  }

  const currentRegistration = getActiveRegistrations(activityId).find(
    (registration) => registration.userId === userId
  );

  if (currentRegistration) {
    throw new Error("你已经报过这个活动了");
  }

  const totalCapacity = activity.totalCapacity ?? 0;
  const confirmedCount = getScopedRegistrations(activityId, null).filter(
    (registration) => registration.signupStatus === "CONFIRMED"
  ).length;
  const waitlistCount = getScopedRegistrations(activityId, null).filter(
    (registration) => registration.signupStatus === "WAITLIST"
  ).length;
  const signupStatus: SignupStatus =
    totalCapacity > 0 && confirmedCount >= totalCapacity ? "WAITLIST" : "CONFIRMED";
  const registration: Registration = {
    id: createId("registration"),
    activityId,
    userId,
    activityCourtId: null,
    signupStatus,
    queueNo: signupStatus === "WAITLIST" ? waitlistCount + 1 : undefined,
    createdAt: new Date().toISOString(),
  };

  store.registrations.push(registration);
  logRegistrationAction({
    activityId,
    registrationId: registration.id,
    action: "REGISTRATION_CREATED",
    operatorId: userId,
    detail: `报名活动，状态：${SIGNUP_STATUS_LABELS[signupStatus]}`,
  });

  return toActivityView(activity, userId);
}

export function cancelRegistration(registrationId: string, userId: string): ActivityView {
  const store = getActivityStore();
  const registration = store.registrations.find((item) => item.id === registrationId);

  if (!registration) {
    throw new Error("报名记录不存在");
  }

  if (registration.userId !== userId) {
    throw new Error("只能取消自己的报名");
  }

  const activity = store.activities.find((item) => item.id === registration.activityId);

  if (!activity) {
    throw new Error("活动不存在");
  }

  const currentTime = new Date();
  if (activity.status === "CANCELLED") {
    throw new Error("活动已取消");
  }

  if (isActivityFinished(activity, currentTime)) {
    throw new Error("活动已结束");
  }

  if (isActivityInProgress(activity, currentTime)) {
    throw new Error("活动进行中，不能取消报名");
  }

  if (new Date(activity.cancelDeadlineAt).getTime() <= currentTime.getTime()) {
    throw new Error("已超过取消报名截止时间");
  }

  registration.signupStatus = "CANCELLED";
  registration.cancelledAt = new Date().toISOString();
  registration.cancelReason = "用户主动取消";

  logRegistrationAction({
    activityId: registration.activityId,
    registrationId: registration.id,
    action: "REGISTRATION_CANCELLED",
    operatorId: userId,
    fromActivityCourtId: registration.activityCourtId ?? undefined,
    detail: "用户主动取消报名",
  });

  promoteWaitlist(
    activity,
    activity.signupMode === "USER_SELECT_COURT" ? registration.activityCourtId ?? null : null
  );

  return toActivityView(activity, userId);
}

export function moveRegistration(
  registrationId: string,
  toActivityCourtId: string,
  operatorId: string
): ActivityView {
  const store = getActivityStore();
  const registration = store.registrations.find(
    (item) => item.id === registrationId && item.signupStatus !== "CANCELLED"
  );

  if (!registration) {
    throw new Error("报名记录不存在");
  }

  const activity = store.activities.find((item) => item.id === registration.activityId);

  if (!activity || !getManageable(activity, operatorId)) {
    throw new Error("你没有管理该活动的权限");
  }

  if (activity.signupMode !== "USER_SELECT_COURT") {
    throw new Error("当前活动不是按场地报名");
  }

  if (activity.status !== "PUBLISHED" || isActivityFinished(activity, new Date())) {
    throw new Error("当前活动不可再调整场地");
  }

  const sourceCourtId = registration.activityCourtId;
  const targetCourt = store.activityCourts.find(
    (item) => item.id === toActivityCourtId && item.activityId === registration.activityId
  );

  if (!sourceCourtId || !targetCourt) {
    throw new Error("目标场地不存在");
  }

  if (sourceCourtId === toActivityCourtId) {
    return toActivityView(activity, operatorId);
  }

  const targetRegistrations = getScopedRegistrations(activity.id, toActivityCourtId).filter(
    (item) => item.id !== registration.id
  );
  const confirmedCount = targetRegistrations.filter(
    (item) => item.signupStatus === "CONFIRMED"
  ).length;
  const waitlistCount = targetRegistrations.filter(
    (item) => item.signupStatus === "WAITLIST"
  ).length;

  registration.activityCourtId = toActivityCourtId;

  if (confirmedCount < targetCourt.capacity) {
    registration.signupStatus = "CONFIRMED";
    delete registration.queueNo;
  } else {
    registration.signupStatus = "WAITLIST";
    registration.queueNo = waitlistCount + 1;
  }

  renumberWaitlist(activity.id, toActivityCourtId);
  promoteWaitlist(activity, sourceCourtId);
  logRegistrationAction({
    activityId: registration.activityId,
    registrationId: registration.id,
    action: "REGISTRATION_MOVED",
    operatorId,
    fromActivityCourtId: sourceCourtId,
    toActivityCourtId,
    detail: `管理员调整场地，最新状态：${SIGNUP_STATUS_LABELS[registration.signupStatus]}`,
  });

  return toActivityView(activity, operatorId);
}

export function updateActivityCourtCapacity(
  activityCourtId: string,
  nextCapacity: number,
  operatorId: string
): ActivityView {
  const store = getActivityStore();
  const court = store.activityCourts.find((item) => item.id === activityCourtId);

  if (!court) {
    throw new Error("活动场地不存在");
  }

  const activity = store.activities.find((item) => item.id === court.activityId);

  if (!activity || !getManageable(activity, operatorId)) {
    throw new Error("你没有管理该活动的权限");
  }

  if (activity.signupMode !== "USER_SELECT_COURT") {
    throw new Error("当前活动不可按场地调整容量");
  }

  if (activity.status !== "PUBLISHED" || isActivityFinished(activity, new Date())) {
    throw new Error("当前活动不可再调整容量");
  }

  const confirmedCount = getScopedRegistrations(activity.id, activityCourtId).filter(
    (registration) => registration.signupStatus === "CONFIRMED"
  ).length;

  if (nextCapacity < confirmedCount || nextCapacity < 1) {
    throw new Error("容量不能小于当前已确认人数");
  }

  court.capacity = nextCapacity;
  promoteWaitlist(activity, activityCourtId);
  logRegistrationAction({
    activityId: activity.id,
    registrationId: "",
    action: "CAPACITY_UPDATED",
    operatorId,
    toActivityCourtId: activityCourtId,
    detail: `容量调整为 ${nextCapacity}`,
  });

  return toActivityView(activity, operatorId);
}

export function getActivityStats(currentUserId: string): {
  publishedCount: number;
  manageableCount: number;
  joinedCount: number;
} {
  const activities = listActivities(currentUserId);

  return {
    publishedCount: activities.filter((activity) => activity.status === "PUBLISHED").length,
    manageableCount: activities.filter((activity) => activity.isManageable).length,
    joinedCount: activities.filter((activity) => activity.currentUserRegistrationId).length,
  };
}

export function getActivityById(
  activityId: string,
  currentUserId?: string | null
): ActivityView | null {
  return listActivities(currentUserId).find((activity) => activity.id === activityId) ?? null;
}

export function listMyActivities(currentUserId: string): MyActivitiesView {
  const activities = listActivities(currentUserId);

  return {
    published: activities.filter((activity) => activity.isManageable),
    joined: activities.filter((activity) => Boolean(activity.currentUserRegistrationId)),
  };
}
