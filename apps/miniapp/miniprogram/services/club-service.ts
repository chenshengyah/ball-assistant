import type { Club } from "../types/activity";
import { getAccessToken } from "./auth";
import { requestApi } from "./api";

type SaveClubInput = {
  clubId?: string;
  currentUserId: string;
  name: string;
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
  contactName: string;
  contactPhone: string;
};

function normalizeText(value: string | undefined): string {
  return value?.trim() ?? "";
}

type ClubApiResponse = {
  clubId: string;
  clubName: string;
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
  status: "ACTIVE" | "INACTIVE";
};

let ownedClubCache: Club[] = [];

function getAuthHeaders(): Record<string, string> {
  const accessToken = getAccessToken();

  if (!accessToken) {
    throw new Error("请先登录后再继续");
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

function toClubModel(response: ClubApiResponse, currentUserId = ""): Club {
  return {
    id: response.clubId,
    name: response.clubName,
    category: response.category ?? "BADMINTON",
    coverUrl: response.coverUrl ?? "",
    logoUrl: response.logoUrl ?? "",
    description: response.description ?? "",
    province: response.province ?? "",
    city: response.city ?? "",
    district: response.district ?? "",
    address: response.address ?? "",
    latitude: response.latitude,
    longitude: response.longitude,
    wechatId: response.wechatId ?? "",
    contactName: response.contactName ?? "",
    contactPhone: response.contactPhone ?? "",
    creatorUserId: currentUserId,
    status: response.status,
  };
}

function syncOwnedClub(club: Club): void {
  const existingIndex = ownedClubCache.findIndex((item) => item.id === club.id);

  if (existingIndex >= 0) {
    ownedClubCache.splice(existingIndex, 1, { ...ownedClubCache[existingIndex], ...club });
  } else {
    ownedClubCache.push({ ...club });
  }
}

function syncOwnedClubs(clubs: Club[]): Club[] {
  ownedClubCache = clubs.map((club) => ({ ...club }));

  return clubs.map((club) => ({ ...club }));
}

export async function fetchOwnedClubs(currentUserId: string): Promise<Club[]> {
  const response = await requestApi<ClubApiResponse[]>({
    path: "/clubs/my",
    headers: getAuthHeaders(),
  });

  return syncOwnedClubs(response.map((item) => toClubModel(item, currentUserId)));
}

export function listOwnedClubs(currentUserId: string): Club[] {
  void currentUserId;

  return ownedClubCache
    .filter((club) => club.status === "ACTIVE")
    .map((club) => ({ ...club }));
}

export function getOwnedClubById(currentUserId: string, clubId: string): Club | undefined {
  return listOwnedClubs(currentUserId).find((club) => club.id === clubId);
}

export async function createOrUpdateClub(input: SaveClubInput): Promise<Club> {
  const name = normalizeText(input.name);
  const contactName = normalizeText(input.contactName);
  const contactPhone = normalizeText(input.contactPhone);
  const address = normalizeText(input.address);

  if (!name) {
    throw new Error("请填写俱乐部名称");
  }

  if (!contactName) {
    throw new Error("请填写联系人");
  }

  if (!/^1[3-9]\d{9}$/.test(contactPhone)) {
    throw new Error("联系电话格式不正确");
  }

  const payload = {
    category: "BADMINTON" as const,
    name,
    coverUrl: normalizeText(input.coverUrl),
    logoUrl: normalizeText(input.logoUrl),
    description: normalizeText(input.description),
    province: normalizeText(input.province),
    city: normalizeText(input.city),
    district: normalizeText(input.district),
    address,
    latitude: input.latitude,
    longitude: input.longitude,
    wechatId: normalizeText(input.wechatId),
    contactName,
    contactPhone,
  };

  const response = input.clubId
    ? await requestApi<ClubApiResponse>({
        path: `/clubs/${encodeURIComponent(input.clubId)}`,
        method: "PUT",
        data: payload,
        headers: getAuthHeaders(),
      })
    : await requestApi<ClubApiResponse>({
        path: "/clubs",
        method: "POST",
        data: payload,
        headers: getAuthHeaders(),
      });

  const nextClub = toClubModel(response, input.currentUserId);
  syncOwnedClub(nextClub);

  return { ...nextClub };
}
