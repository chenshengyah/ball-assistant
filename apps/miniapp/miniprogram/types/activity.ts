export type OwnerType = "PERSONAL" | "CLUB";

export type ChargeMode = "FREE" | "FIXED" | "AA" | "OTHER";

export type SignupStatus = "CONFIRMED" | "WAITLIST" | "CANCELLED";

export type ActivityStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "CANCELLED";

export type ClubRole = "OWNER" | "ADMIN" | "MEMBER";

export type VenueStatus = "ACTIVE" | "INACTIVE";

export type ActivitySignupMode = "USER_SELECT_COURT" | "GENERAL";

export type RegistrationLogAction =
  | "REGISTRATION_CREATED"
  | "REGISTRATION_CANCELLED"
  | "REGISTRATION_MOVED"
  | "CAPACITY_UPDATED";

export type UserGender = "MALE" | "FEMALE";

export type UserProfile = {
  id: string;
  nickname: string;
  gender: UserGender;
  avatarUrl?: string;
  avatarColor: string;
  baseProfileComplete?: boolean;
  phoneNumber?: string;
  phoneCountryCode?: string;
  phoneVerifiedAt?: string;
  contactProfileComplete?: boolean;
};

export type Venue = {
  id: string;
  ownerType: OwnerType;
  ownerId: string;
  name: string;
  shortName: string;
  province: string;
  city: string;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
  navigationName: string;
  status: VenueStatus;
};

export type VenueCourt = {
  id: string;
  venueId: string;
  courtCode: string;
  courtName: string;
  defaultCapacity?: number | null;
  sortOrder: number;
  status: VenueStatus;
};

export type Club = {
  id: string;
  name: string;
  category?: "BADMINTON";
  coverUrl?: string;
  logoUrl?: string;
  description?: string;
  province?: string;
  city?: string;
  district?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  wechatId?: string;
  contactName?: string;
  contactPhone?: string;
  creatorUserId?: string;
  status: "ACTIVE" | "INACTIVE";
};

export type OwnerDisplay = {
  mode: OwnerType;
  name: string;
  avatarUrl?: string;
  avatarColor?: string;
  logoUrl?: string;
  contactName?: string;
  contactPhone?: string;
  contactPhoneMasked?: string;
};

export type ClubMember = {
  id: string;
  clubId: string;
  userId: string;
  role: ClubRole;
};

export type Activity = {
  id: string;
  ownerType: OwnerType;
  ownerId: string;
  createdBy: string;
  coverUrl?: string;
  ownerDisplay: OwnerDisplay;
  title: string;
  chargeMode: ChargeMode;
  chargeAmountCents: number;
  chargeDesc: string;
  venueId: string;
  venueSnapshotName: string;
  activityStartAt: string;
  activityEndAt: string;
  cancelCutoffMinutesBeforeStart: number;
  cancelDeadlineAt: string;
  descriptionRichtext: string;
  signupMode: ActivitySignupMode;
  totalCapacity?: number;
  status: ActivityStatus;
};

export type ActivityCourt = {
  id: string;
  activityId: string;
  venueCourtId: string;
  courtCodeSnapshot: string;
  courtNameSnapshot: string;
  capacity: number;
  sortOrder: number;
  status: "ACTIVE" | "INACTIVE";
};

export type Registration = {
  id: string;
  activityId: string;
  userId: string;
  activityCourtId?: string | null;
  signupStatus: SignupStatus;
  queueNo?: number;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
};

export type RegistrationLog = {
  id: string;
  activityId: string;
  registrationId: string;
  action: RegistrationLogAction;
  operatorId: string;
  fromActivityCourtId?: string;
  toActivityCourtId?: string;
  detail: string;
  createdAt: string;
};

export type OwnerOption = {
  key: string;
  ownerType: OwnerType;
  ownerId: string;
  label: string;
};

export type VenueCreateInput = {
  ownerType: OwnerType;
  ownerId: string;
  name: string;
  shortName: string;
  province: string;
  city: string;
  district: string;
  address: string;
  latitude?: number;
  longitude?: number;
  navigationName: string;
  courtCodes: string[];
};

export type VenueUpdateInput = {
  venueId: string;
  name: string;
  shortName: string;
  province: string;
  city: string;
  district: string;
  address: string;
  latitude?: number;
  longitude?: number;
  navigationName: string;
};

export type VenueCourtCreateInput = {
  venueId: string;
  courtCode: string;
  courtName: string;
};

export type VenueCourtUpdateInput = {
  courtId: string;
  courtCode: string;
  courtName: string;
};

export type CreateActivityCourtInput = {
  venueCourtId: string;
  capacity: number;
  sortOrder: number;
};

export type CreateActivityInput = {
  ownerType: OwnerType;
  ownerId: string;
  createdBy: string;
  coverUrl?: string;
  title: string;
  chargeMode: ChargeMode;
  chargeAmountCents: number;
  chargeDesc: string;
  venueId: string;
  signupMode: ActivitySignupMode;
  activityDate: string;
  startTime: string;
  endTime: string;
  cancelCutoffMinutesBeforeStart: number;
  descriptionRichtext: string;
  totalCapacity?: number;
  courts: CreateActivityCourtInput[];
};

export type RegistrationMemberView = {
  registrationId: string;
  userId: string;
  nickname: string;
  avatarColor: string;
  signupStatus: SignupStatus;
  queueNo?: number;
  isCurrentUser: boolean;
};

export type ActivityCourtView = {
  id: string;
  venueCourtId: string;
  label: string;
  code: string;
  capacity: number;
  confirmedCount: number;
  waitlistCount: number;
  isFull: boolean;
  registrations: RegistrationMemberView[];
};

export type ActivityView = {
  id: string;
  title: string;
  ownerLabel: string;
  ownerType: OwnerType;
  ownerDisplay: OwnerDisplay;
  coverUrl?: string;
  signupMode: ActivitySignupMode;
  venueLabel: string;
  chargeText: string;
  lifecycleStatusLabel: string;
  signupStatusLabel: string;
  isSignupOpen: boolean;
  isInProgress: boolean;
  isFinished: boolean;
  scheduleText: string;
  cancelDeadlineText: string;
  descriptionRichtext: string;
  status: ActivityStatus;
  isManageable: boolean;
  currentUserRegistrationId: string | null;
  currentUserSignupLabel: string;
  canCancelCurrentUserRegistration: boolean;
  totalCapacity: number | null;
  courts: ActivityCourtView[];
  registrations: RegistrationMemberView[];
  confirmedCount: number;
  waitlistCount: number;
  activityStartAt: string;
};

export type MyActivitiesView = {
  published: ActivityView[];
  joined: ActivityView[];
};

export type VenueWithCourts = {
  venue: Venue;
  courts: VenueCourt[];
};

export type ActivityDraft = {
  sourceActivityId?: string;
  ownerType: OwnerType;
  ownerId: string;
  coverUrl?: string;
  signupMode: ActivitySignupMode;
  title: string;
  chargeMode: ChargeMode;
  chargeAmountCents: number;
  chargeDesc: string;
  venueId: string;
  activityDate: string;
  startTime: string;
  endTime: string;
  cancelCutoffMinutesBeforeStart: number;
  descriptionRichtext: string;
  totalCapacity?: number;
  courts: Array<CreateActivityCourtInput & { label?: string }>;
};
