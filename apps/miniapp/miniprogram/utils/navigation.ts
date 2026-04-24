export const HOME_TAB_ROUTE = "/pages/home/index";
export const PROFILE_TAB_ROUTE = "/pages/profile/index";

const HOME_OWNED_ROUTES = new Set([
  HOME_TAB_ROUTE,
  "/pages/activity-detail/index",
  "/pages/activity-create/index",
]);

const PROFILE_OWNED_ROUTES = new Set([
  PROFILE_TAB_ROUTE,
  "/pages/my-activities/index",
  "/pages/club-register/index",
  "/pages/club-management/index",
]);

const HOME_OWNED_SOURCES = new Set(["activity-create", "activity-detail"]);
const PROFILE_OWNED_SOURCES = new Set([
  "profile",
  "my-activities",
  "club-register",
  "club-management",
]);

type PageLike = {
  route?: string;
  options?: Record<string, string | undefined>;
};

export function normalizeRoute(route: string): string {
  if (!route) {
    return HOME_TAB_ROUTE;
  }

  return route.startsWith("/") ? route : `/${route}`;
}

export function normalizeSource(source: string | undefined): string {
  return typeof source === "string" ? decodeURIComponent(source).trim() : "";
}

export function isTabRoute(route: string): boolean {
  const normalizedRoute = normalizeRoute(route);

  return normalizedRoute === HOME_TAB_ROUTE || normalizedRoute === PROFILE_TAB_ROUTE;
}

export function resolveOwningTab(route: string, source?: string): string {
  const normalizedRoute = normalizeRoute(route);
  const normalizedSource = normalizeSource(source);

  if (HOME_OWNED_ROUTES.has(normalizedRoute)) {
    return HOME_TAB_ROUTE;
  }

  if (PROFILE_OWNED_ROUTES.has(normalizedRoute)) {
    return PROFILE_TAB_ROUTE;
  }

  if (normalizedRoute === "/pages/venue-court-management/index") {
    return normalizedSource === "activity-create" ? HOME_TAB_ROUTE : PROFILE_TAB_ROUTE;
  }

  if (normalizedRoute === "/pages/user-registration/index") {
    return HOME_OWNED_SOURCES.has(normalizedSource) ? HOME_TAB_ROUTE : PROFILE_TAB_ROUTE;
  }

  if (PROFILE_OWNED_SOURCES.has(normalizedSource)) {
    return PROFILE_TAB_ROUTE;
  }

  return HOME_TAB_ROUTE;
}

export function getOwningTabForPage(page: PageLike | undefined): string {
  if (!page) {
    return HOME_TAB_ROUTE;
  }

  return resolveOwningTab(page.route ?? "", page.options?.source);
}
