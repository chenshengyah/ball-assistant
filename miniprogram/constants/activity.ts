import type {
  ActivitySignupMode,
  ActivityStatus,
  ChargeMode,
  ClubRole,
  OwnerType,
  SignupStatus,
} from "../types/activity";

export const CHARGE_MODE_OPTIONS: Array<{
  value: ChargeMode;
  label: string;
}> = [
  { value: "FREE", label: "免费" },
  { value: "FIXED", label: "固定收费" },
  { value: "AA", label: "AA" },
  { value: "OTHER", label: "其他" },
];

export const CANCEL_CUTOFF_OPTIONS: Array<{
  value: number;
  label: string;
}> = [
  { value: 0, label: "活动前 0 小时" },
  { value: 60, label: "活动前 1 小时" },
  { value: 120, label: "活动前 2 小时" },
  { value: 360, label: "活动前 6 小时" },
  { value: 720, label: "活动前 12 小时" },
  { value: 1440, label: "活动前 24 小时" },
];

export const SIGNUP_MODE_OPTIONS: Array<{
  value: ActivitySignupMode;
  label: string;
}> = [
  { value: "USER_SELECT_COURT", label: "按场地报名" },
  { value: "GENERAL", label: "统一报名" },
];

export const OWNER_TYPE_LABELS: Record<OwnerType, string> = {
  PERSONAL: "个人",
  CLUB: "俱乐部",
};

export const CLUB_ROLE_LABELS: Record<ClubRole, string> = {
  OWNER: "负责人",
  ADMIN: "管理员",
  MEMBER: "成员",
};

export const SIGNUP_STATUS_LABELS: Record<SignupStatus, string> = {
  CONFIRMED: "已确认",
  WAITLIST: "候补",
  CANCELLED: "已取消",
};

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  DRAFT: "草稿",
  PUBLISHED: "已发布",
  CANCELLED: "已取消",
};
