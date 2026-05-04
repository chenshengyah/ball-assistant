import type {
  OwnerType,
  VenueCourt,
  VenueCourtCreateInput,
  VenueCourtUpdateInput,
  VenueCreateInput,
  VenueUpdateInput,
  VenueWithCourts,
} from "../types/activity";
import { getAccessToken, getCurrentUserId } from "./auth";
import { requestApi } from "./api";

function normalizeText(value: string): string {
  return value.trim();
}

type VenueApiResponse = VenueWithCourts;

let venueCache: VenueWithCourts[] = [];

function getAuthHeaders(): Record<string, string> {
  const accessToken = getAccessToken();

  if (!accessToken) {
    throw new Error("请先登录后再继续");
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

function resolveOwnerId(ownerType: OwnerType, ownerId: string): string {
  if (ownerType !== "PERSONAL") {
    return ownerId;
  }

  return getCurrentUserId() || ownerId;
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
  return venueCache
    .flatMap((item) => item.courts)
    .filter((court) => court.venueId === venueId && (includeInactive ? true : court.status === "ACTIVE"))
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((court) => ({ ...court }));
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
  return venueCache
    .filter((item) => item.venue.status === "ACTIVE" && matchesOwner(item.venue, ownerType, ownerId))
    .map((venue) => ({
      venue: { ...venue.venue },
      courts: getSortedCourts(venue.venue.id, true),
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
  const venueIndex = venueCache.findIndex((item) => item.venue.id === snapshot.venue.id);
  const nextSnapshot = {
    venue: { ...snapshot.venue },
    courts: snapshot.courts.map((court) => ({ ...court })),
  };

  if (venueIndex >= 0) {
    venueCache.splice(venueIndex, 1, nextSnapshot);
  } else {
    venueCache.push(nextSnapshot);
  }

  return nextSnapshot;
}

function syncVenueSnapshots(snapshots: VenueWithCourts[]): VenueWithCourts[] {
  const incomingIds = new Set(snapshots.map((snapshot) => snapshot.venue.id));
  venueCache = venueCache.filter((snapshot) => !incomingIds.has(snapshot.venue.id));

  return snapshots.map((snapshot) => syncVenueSnapshot(snapshot));
}

export async function fetchVenuesForOwner(
  ownerType: OwnerType,
  ownerId: string
): Promise<VenueWithCourts[]> {
  const resolvedOwnerId = resolveOwnerId(ownerType, ownerId);
  const response = await requestApi<VenueApiResponse[]>({
    path: `/venues?ownerType=${encodeURIComponent(ownerType)}&ownerId=${encodeURIComponent(resolvedOwnerId)}`,
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
      ownerId: resolveOwnerId(input.ownerType, input.ownerId),
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

  const venueIndex = venueCache.findIndex((item) => item.venue.id === response.venueId);

  if (venueIndex >= 0) {
    const courts = venueCache[venueIndex].courts;
    const existingIndex = courts.findIndex((item) => item.id === response.id);

    if (existingIndex >= 0) {
      courts.splice(existingIndex, 1, { ...courts[existingIndex], ...response });
    } else {
      courts.push({ ...response });
    }
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

  const venue = venueCache.find((item) => item.venue.id === response.venueId);
  const existingCourt = venue?.courts.find((item) => item.id === response.id);

  if (existingCourt) {
    Object.assign(existingCourt, response);
  } else if (venue) {
    venue.courts.push({ ...response });
  }

  return { ...response };
}

export async function deactivateVenueCourt(courtId: string): Promise<VenueCourt> {
  const response = await requestApi<VenueCourt>({
    path: `/courts/${encodeURIComponent(courtId)}/disable`,
    method: "POST",
    headers: getAuthHeaders(),
  });

  const venue = venueCache.find((item) => item.venue.id === response.venueId);
  const existingCourt = venue?.courts.find((item) => item.id === response.id);

  if (existingCourt) {
    Object.assign(existingCourt, response);
  } else if (venue) {
    venue.courts.push({ ...response });
  }

  return { ...response };
}
