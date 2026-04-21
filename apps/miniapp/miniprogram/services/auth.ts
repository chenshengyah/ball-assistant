import type { UserGender } from "../types/activity";
import { requestApi } from "./api";

export type AuthStatus =
  | "ANONYMOUS"
  | "AUTHENTICATED_INCOMPLETE"
  | "AUTHENTICATED_COMPLETE";

export type PendingIntent =
  | { type: "CREATE_ACTIVITY" }
  | { type: "SIGN_UP_ACTIVITY"; activityId: string; activityCourtId?: string }
  | { type: "CANCEL_SIGNUP"; activityId: string; registrationId: string }
  | { type: "OPEN_MY_ACTIVITIES" }
  | { type: "OPEN_CLUB_REGISTER" };

export type SessionUser = {
  userId: string;
  nickname: string;
  gender: UserGender | null;
  avatarUrl: string;
  avatarColor: string;
  baseProfileComplete: boolean;
  isProfileComplete: boolean;
};

type LoginResponse = {
  accessToken: string;
  user: SessionUser;
  baseProfileComplete: boolean;
  isProfileComplete: boolean;
};

type UpdateProfileInput = {
  nickname: string;
  gender: UserGender;
  avatarUrl?: string;
};

type AuthState = {
  status: AuthStatus;
  accessToken: string;
  user: SessionUser | null;
  baseProfileComplete: boolean;
  isProfileComplete: boolean;
  pendingIntent: PendingIntent | null;
  didBootstrap: boolean;
};

const MOCK_CURRENT_USER_ID = "user-current";

const state: AuthState = {
  status: "ANONYMOUS",
  accessToken: "",
  user: null,
  baseProfileComplete: false,
  isProfileComplete: false,
  pendingIntent: null,
  didBootstrap: false,
};

function deriveStatus(baseProfileComplete: boolean, user: SessionUser | null): AuthStatus {
  if (!user) {
    return "ANONYMOUS";
  }

  return baseProfileComplete ? "AUTHENTICATED_COMPLETE" : "AUTHENTICATED_INCOMPLETE";
}

function setSession(loginResponse: LoginResponse): void {
  state.accessToken = loginResponse.accessToken;
  state.user = loginResponse.user;
  state.baseProfileComplete = loginResponse.user.baseProfileComplete;
  state.isProfileComplete = loginResponse.isProfileComplete;
  state.status = deriveStatus(loginResponse.user.baseProfileComplete, loginResponse.user);
}

function clearSession(): void {
  state.status = "ANONYMOUS";
  state.accessToken = "";
  state.user = null;
  state.baseProfileComplete = false;
  state.isProfileComplete = false;
}

function applyUserProfile(user: SessionUser): void {
  state.user = user;
  state.baseProfileComplete = user.baseProfileComplete;
  state.isProfileComplete = user.isProfileComplete;
  state.status = deriveStatus(user.baseProfileComplete, user);
}

function getIntentSource(intent: PendingIntent): string {
  switch (intent.type) {
    case "CREATE_ACTIVITY":
      return "activity-create";
    case "SIGN_UP_ACTIVITY":
    case "CANCEL_SIGNUP":
      return "activity-detail";
    case "OPEN_MY_ACTIVITIES":
      return "my-activities";
    case "OPEN_CLUB_REGISTER":
      return "club-register";
  }
}

function wxLogin(): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (result) => {
        if (!result.code) {
          reject(new Error("未获取到登录 code"));
          return;
        }

        resolve(result.code);
      },
      fail: reject,
    });
  });
}

async function loginWithWechatCode(code: string): Promise<LoginResponse> {
  return requestApi<LoginResponse>({
    path: "/auth/wechat/login",
    method: "POST",
    data: { code },
  });
}

function navigateToUserRegistration(source: string): void {
  wx.navigateTo({
    url: `/pages/user-registration/index?source=${encodeURIComponent(source)}`,
  });
}

export function getAuthSnapshot(): AuthState {
  return {
    ...state,
    user: state.user ? { ...state.user } : null,
    pendingIntent: state.pendingIntent ? { ...state.pendingIntent } : null,
  };
}

export async function bootstrapAuth(): Promise<AuthState> {
  if (state.didBootstrap) {
    return getAuthSnapshot();
  }

  state.didBootstrap = true;

  try {
    const code = await wxLogin();
    const loginResponse = await loginWithWechatCode(code);
    setSession(loginResponse);
  } catch {
    clearSession();
  }

  return getAuthSnapshot();
}

export async function ensureAuthenticated(): Promise<boolean> {
  if (state.status !== "ANONYMOUS") {
    return true;
  }

  try {
    const code = await wxLogin();
    const loginResponse = await loginWithWechatCode(code);
    setSession(loginResponse);

    return true;
  } catch {
    wx.showToast({
      title: "登录失败，请稍后再试",
      icon: "none",
    });
    return false;
  }
}

export async function requireCompleteProfile(intent: PendingIntent): Promise<boolean> {
  const isAuthenticated = await ensureAuthenticated();

  if (!isAuthenticated) {
    return false;
  }

  if (!hasRequiredProfileForIntent(intent)) {
    state.pendingIntent = intent;
    navigateToUserRegistration(getIntentSource(intent));
    return false;
  }

  clearPendingIntent();

  return true;
}

export async function openUserRegistrationFromProfile(): Promise<void> {
  const isAuthenticated = await ensureAuthenticated();

  if (!isAuthenticated) {
    return;
  }

  clearPendingIntent();
  navigateToUserRegistration("profile");
}

export async function updateCurrentUserProfile(
  input: UpdateProfileInput
): Promise<SessionUser | null> {
  if (!state.accessToken) {
    return null;
  }

  const user = await requestApi<SessionUser>({
    path: "/users/me/profile",
    method: "PUT",
    data: {
      nickname: input.nickname,
      gender: input.gender,
      avatarUrl: input.avatarUrl ?? "",
    },
    headers: {
      Authorization: `Bearer ${state.accessToken}`,
    },
  });

  applyUserProfile(user);

  return { ...user };
}

export function getCurrentMockUserId(): string | null {
  return state.status === "ANONYMOUS" ? null : MOCK_CURRENT_USER_ID;
}

export function clearPendingIntent(): void {
  state.pendingIntent = null;
}

export function getPendingIntent(): PendingIntent | null {
  return state.pendingIntent ? { ...state.pendingIntent } : null;
}

export function hasRequiredProfileForIntent(intent: PendingIntent): boolean {
  void intent;
  return state.baseProfileComplete;
}

export function resumePendingIntent(): void {
  const pendingIntent = getPendingIntent();
  clearPendingIntent();

  if (!pendingIntent) {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
      return;
    }

    wx.switchTab({
      url: "/pages/home/index",
    });
    return;
  }

  switch (pendingIntent.type) {
    case "CREATE_ACTIVITY":
      wx.redirectTo({
        url: "/pages/activity-create/index",
      });
      return;
    case "OPEN_MY_ACTIVITIES":
      wx.navigateTo({
        url: "/pages/my-activities/index",
      });
      return;
    case "OPEN_CLUB_REGISTER":
      wx.showToast({
        title: "俱乐部页面建设中",
        icon: "none",
      });
      return;
    case "SIGN_UP_ACTIVITY":
      wx.navigateTo({
        url: `/pages/activity-detail/index?activityId=${encodeURIComponent(
          pendingIntent.activityId
        )}&pendingAction=signup${
          pendingIntent.activityCourtId
            ? `&activityCourtId=${encodeURIComponent(pendingIntent.activityCourtId)}`
            : ""
        }`,
      });
      return;
    case "CANCEL_SIGNUP":
      wx.navigateTo({
        url: `/pages/activity-detail/index?activityId=${encodeURIComponent(
          pendingIntent.activityId
        )}&pendingAction=cancel&registrationId=${encodeURIComponent(
          pendingIntent.registrationId
        )}`,
      });
      return;
  }
}
