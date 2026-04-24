import type {
  OwnerType,
  VenueCourt,
  VenueCourtCreateInput,
  VenueCourtUpdateInput,
  VenueCreateInput,
  VenueUpdateInput,
  VenueWithCourts,
} from "../types/activity";
import { getActivityStore } from "./activity-store";
import { getAccessToken } from "./auth";
import { requestApi } from "./api";

function normalizeText(value: string): string {
  return value.trim();
}

type VenueApiResponse = VenueWithCourts;

function getAuthHeaders(): Record<string, string> {
  const accessToken = getAccessToken();

  if (!accessToken) {
    throw new Error("请先登录后再继续");
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

function normalizeCourtCodes(courtCodes: string[]): string[] {
  return courtCodes
    .map((courtCode) => normalizeText(courtCode))
    .filter((courtCode, index, list) => courtCode.length > 0 && list.indexOf(courtCode) === index);
}

function getDefaultCourtName(courtCode: string): string {
  return /^\d+$/.test(courtCode) ? `${courtCode} 号场` : `${courtCode} 场`;
}

function getSortedCourts(venueId: string, includeInactive = false): VenueCourt[] {
  return getActivityStore().venueCourts
    .filter(
      (court) =>
        court.venueId === venueId && (includeInactive ? true : court.status === "ACTIVE")
    )
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((court) => ({ ...court }));
}

function assertUniqueCourtCode(venueId: string, courtCode: string, excludeCourtId = ""): void {
  const normalizedCode = normalizeText(courtCode);
  const duplicatedCourt = getActivityStore().venueCourts.find(
    (court) =>
      court.venueId === venueId &&
      court.id !== excludeCourtId &&
      normalizeText(court.courtCode) === normalizedCode
  );

  if (duplicatedCourt) {
    throw new Error("该场地号已存在，请换一个");
  }
}

function matchesOwner(
  venue: VenueWithCourts["venue"],
  ownerType?: OwnerType,
  ownerId?: string
): boolean {
  if (!ownerType || !ownerId) {
    return true;
  }

  return venue.ownerType === ownerType && venue.ownerId === ownerId;
}

export function listVenuesForManagement(
  ownerType?: OwnerType,
  ownerId?: string
): VenueWithCourts[] {
  const store = getActivityStore();

  return store.venues
    .filter((venue) => venue.status === "ACTIVE" && matchesOwner(venue, ownerType, ownerId))
    .map((venue) => ({
      venue: { ...venue },
      courts: getSortedCourts(venue.id, true),
    }));
}

export function listVenues(ownerType?: OwnerType, ownerId?: string): VenueWithCourts[] {
  return listVenuesForManagement(ownerType, ownerId).map((item) => ({
    venue: { ...item.venue },
    courts: item.courts.filter((court) => court.status === "ACTIVE").map((court) => ({ ...court })),
  }));
}

export function listVenueCourts(venueId: string, includeInactive = false): VenueCourt[] {
  return getSortedCourts(venueId, includeInactive);
}

function syncVenueSnapshot(snapshot: VenueWithCourts): VenueWithCourts {
  const store = getActivityStore();
  const venueIndex = store.venues.findIndex((item) => item.id === snapshot.venue.id);

  if (venueIndex >= 0) {
    store.venues.splice(venueIndex, 1, { ...store.venues[venueIndex], ...snapshot.venue });
  } else {
    store.venues.push({ ...snapshot.venue });
  }

  store.venueCourts = store.venueCourts.filter((court) => court.venueId !== snapshot.venue.id);
  store.venueCourts.push(...snapshot.courts.map((court) => ({ ...court })));

  return {
    venue: { ...snapshot.venue },
    courts: snapshot.courts.map((court) => ({ ...court })),
  };
}

function syncVenueSnapshots(snapshots: VenueWithCourts[]): VenueWithCourts[] {
  return snapshots.map((snapshot) => syncVenueSnapshot(snapshot));
}

export async function fetchVenuesForOwner(
  ownerType: OwnerType,
  ownerId: string
): Promise<VenueWithCourts[]> {
  const response = await requestApi<VenueApiResponse[]>({
    path: `/venues?ownerType=${encodeURIComponent(ownerType)}&ownerId=${encodeURIComponent(ownerId)}`,
    headers: getAuthHeaders(),
  });

  return syncVenueSnapshots(response);
}

export async function createVenue(input: VenueCreateInput): Promise<VenueWithCourts> {
  if (!normalizeText(input.name)) {
    throw new Error("请填写场馆名称");
  }

  const createdVenue = await requestApi<VenueApiResponse>({
    path: "/venues",
    method: "POST",
    data: {
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      name: normalizeText(input.name),
      shortName: normalizeText(input.shortName) || normalizeText(input.name),
      province: normalizeText(input.province),
      city: normalizeText(input.city),
      district: normalizeText(input.district),
      address: normalizeText(input.address),
      latitude: input.latitude,
      longitude: input.longitude,
      navigationName: normalizeText(input.navigationName) || normalizeText(input.name),
    },
    headers: getAuthHeaders(),
  });

  const syncedVenue = syncVenueSnapshot(createdVenue);
  const courtCodes = normalizeCourtCodes(input.courtCodes);

  if (courtCodes.length === 0) {
    throw new Error("请至少新增一片场地");
  }

  for (const [index, courtCode] of courtCodes.entries()) {
    await createVenueCourt({
      venueId: syncedVenue.venue.id,
      courtCode,
      courtName: getDefaultCourtName(courtCode),
      defaultCapacity: index < 4 ? 8 : undefined,
    });
  }

  const venues = await fetchVenuesForOwner(syncedVenue.venue.ownerType, syncedVenue.venue.ownerId);

  return (
    venues.find((item) => item.venue.id === syncedVenue.venue.id) ??
    syncVenueSnapshot({
      venue: syncedVenue.venue,
      courts: listVenueCourts(syncedVenue.venue.id, true),
    })
  );
}

export async function updateVenue(input: VenueUpdateInput): Promise<VenueWithCourts> {
  if (!normalizeText(input.name)) {
    throw new Error("请填写场馆名称");
  }

  const response = await requestApi<VenueApiResponse>({
    path: `/venues/${encodeURIComponent(input.venueId)}`,
    method: "PUT",
    data: {
      name: normalizeText(input.name),
      shortName: normalizeText(input.shortName) || normalizeText(input.name),
      province: normalizeText(input.province),
      city: normalizeText(input.city),
      district: normalizeText(input.district),
      address: normalizeText(input.address),
      latitude: input.latitude,
      longitude: input.longitude,
      navigationName: normalizeText(input.navigationName) || normalizeText(input.name),
    },
    headers: getAuthHeaders(),
  });

  return syncVenueSnapshot(response);
}

export async function createVenueCourt(
  input: VenueCourtCreateInput & { defaultCapacity?: number }
): Promise<VenueCourt> {
  const courtCode = normalizeText(input.courtCode);
  const courtName = normalizeText(input.courtName) || getDefaultCourtName(courtCode);

  if (!courtCode) {
    throw new Error("请填写场地号");
  }

  const response = await requestApi<VenueCourt>({
    path: "/courts",
    method: "POST",
    data: {
      venueId: input.venueId,
      courtCode,
      courtName,
      defaultCapacity: input.defaultCapacity,
    },
    headers: getAuthHeaders(),
  });

  const store = getActivityStore();
  const existingIndex = store.venueCourts.findIndex((item) => item.id === response.id);

  if (existingIndex >= 0) {
    store.venueCourts.splice(existingIndex, 1, { ...store.venueCourts[existingIndex], ...response });
  } else {
    store.venueCourts.push({ ...response });
  }

  return { ...response };
}

export async function updateVenueCourt(
  input: VenueCourtUpdateInput & { defaultCapacity?: number }
): Promise<VenueCourt> {
  const courtCode = normalizeText(input.courtCode);
  const courtName = normalizeText(input.courtName) || getDefaultCourtName(courtCode);

  if (!courtCode) {
    throw new Error("请填写场地号");
  }

  const response = await requestApi<VenueCourt>({
    path: `/courts/${encodeURIComponent(input.courtId)}`,
    method: "PUT",
    data: {
      courtCode,
      courtName,
      defaultCapacity: input.defaultCapacity,
    },
    headers: getAuthHeaders(),
  });

  const existingCourt = getActivityStore().venueCourts.find((item) => item.id === response.id);

  if (existingCourt) {
    Object.assign(existingCourt, response);
  } else {
    getActivityStore().venueCourts.push({ ...response });
  }

  return { ...response };
}

export async function deactivateVenueCourt(courtId: string): Promise<VenueCourt> {
  const response = await requestApi<VenueCourt>({
    path: `/courts/${encodeURIComponent(courtId)}/disable`,
    method: "POST",
    headers: getAuthHeaders(),
  });

  const existingCourt = getActivityStore().venueCourts.find((item) => item.id === response.id);

  if (existingCourt) {
    Object.assign(existingCourt, response);
  } else {
    getActivityStore().venueCourts.push({ ...response });
  }

  return { ...response };
}
