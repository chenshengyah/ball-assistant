import type {
  VenueCourt,
  VenueCourtCreateInput,
  VenueCourtUpdateInput,
  VenueCreateInput,
  VenueUpdateInput,
  VenueWithCourts,
} from "../types/activity";
import { getActivityStore } from "./activity-store";
import { createId } from "./id";

function normalizeText(value: string): string {
  return value.trim();
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

export function listVenuesForManagement(): VenueWithCourts[] {
  const store = getActivityStore();

  return store.venues
    .filter((venue) => venue.status === "ACTIVE")
    .map((venue) => ({
      venue: { ...venue },
      courts: getSortedCourts(venue.id, true),
    }));
}

export function listVenues(): VenueWithCourts[] {
  return listVenuesForManagement().map((item) => ({
    venue: { ...item.venue },
    courts: item.courts.filter((court) => court.status === "ACTIVE").map((court) => ({ ...court })),
  }));
}

export function listVenueCourts(venueId: string, includeInactive = false): VenueCourt[] {
  return getSortedCourts(venueId, includeInactive);
}

export function createVenue(input: VenueCreateInput): VenueWithCourts {
  const store = getActivityStore();
  const venueId = createId("venue");
  const courtCodes = normalizeCourtCodes(input.courtCodes);

  if (!normalizeText(input.name)) {
    throw new Error("请填写场馆名称");
  }

  if (courtCodes.length === 0) {
    throw new Error("请至少新增一片场地");
  }

  const venue = {
    id: venueId,
    name: normalizeText(input.name),
    shortName: normalizeText(input.shortName) || normalizeText(input.name),
    province: normalizeText(input.province),
    city: normalizeText(input.city),
    district: normalizeText(input.district),
    address: normalizeText(input.address),
    latitude: input.latitude,
    longitude: input.longitude,
    navigationName: normalizeText(input.navigationName) || normalizeText(input.name),
    status: "ACTIVE" as const,
  };

  const courts = courtCodes.map((courtCode, index) => ({
    id: createId("court"),
    venueId,
    courtCode,
    courtName: getDefaultCourtName(courtCode),
    sortOrder: index + 1,
    status: "ACTIVE" as const,
  }));

  store.venues.push(venue);
  store.venueCourts.push(...courts);

  return {
    venue: { ...venue },
    courts: courts.map((court) => ({ ...court })),
  };
}

export function updateVenue(input: VenueUpdateInput): VenueWithCourts {
  const store = getActivityStore();
  const venue = store.venues.find((item) => item.id === input.venueId && item.status === "ACTIVE");

  if (!venue) {
    throw new Error("场馆不存在");
  }

  if (!normalizeText(input.name)) {
    throw new Error("请填写场馆名称");
  }

  venue.name = normalizeText(input.name);
  venue.shortName = normalizeText(input.shortName) || venue.name;
  venue.province = normalizeText(input.province);
  venue.city = normalizeText(input.city);
  venue.district = normalizeText(input.district);
  venue.address = normalizeText(input.address);
  venue.latitude = input.latitude;
  venue.longitude = input.longitude;
  venue.navigationName = normalizeText(input.navigationName) || venue.name;

  return {
    venue: { ...venue },
    courts: getSortedCourts(venue.id, true),
  };
}

export function createVenueCourt(input: VenueCourtCreateInput): VenueCourt {
  const store = getActivityStore();
  const venue = store.venues.find((item) => item.id === input.venueId && item.status === "ACTIVE");
  const courtCode = normalizeText(input.courtCode);
  const courtName = normalizeText(input.courtName) || getDefaultCourtName(courtCode);

  if (!venue) {
    throw new Error("场馆不存在");
  }

  if (!courtCode) {
    throw new Error("请填写场地号");
  }

  assertUniqueCourtCode(input.venueId, courtCode);

  const sortOrder =
    store.venueCourts
      .filter((court) => court.venueId === input.venueId)
      .reduce((max, court) => Math.max(max, court.sortOrder), 0) + 1;

  const nextCourt = {
    id: createId("court"),
    venueId: input.venueId,
    courtCode,
    courtName,
    sortOrder,
    status: "ACTIVE" as const,
  };

  store.venueCourts.push(nextCourt);

  return { ...nextCourt };
}

export function updateVenueCourt(input: VenueCourtUpdateInput): VenueCourt {
  const court = getActivityStore().venueCourts.find((item) => item.id === input.courtId);
  const courtCode = normalizeText(input.courtCode);
  const courtName = normalizeText(input.courtName) || getDefaultCourtName(courtCode);

  if (!court) {
    throw new Error("场地不存在");
  }

  if (!courtCode) {
    throw new Error("请填写场地号");
  }

  assertUniqueCourtCode(court.venueId, courtCode, court.id);

  court.courtCode = courtCode;
  court.courtName = courtName;

  return { ...court };
}

export function deactivateVenueCourt(courtId: string): VenueCourt {
  const court = getActivityStore().venueCourts.find((item) => item.id === courtId);

  if (!court) {
    throw new Error("场地不存在");
  }

  court.status = "INACTIVE";

  return { ...court };
}
