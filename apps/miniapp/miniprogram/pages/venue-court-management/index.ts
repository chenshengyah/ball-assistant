import {
  createVenue,
  createVenueCourt,
  deactivateVenueCourt,
  fetchVenuesForOwner,
  updateVenue,
  updateVenueCourt,
} from "../../services/venue-service";
import { ensureAuthenticated, getCurrentUserId } from "../../services/auth";
import { fetchOwnedClubs, listOwnedClubs } from "../../services/club-service";
import type { OwnerType, VenueStatus, VenueWithCourts } from "../../types/activity";
import { getPageTopStyle } from "../../utils/chrome";
import { resolveOwningTab } from "../../utils/navigation";

type VenueForm = {
  venueId: string;
  isNew: boolean;
  name: string;
  shortName: string;
  province: string;
  city: string;
  district: string;
  address: string;
  latitude: string;
  longitude: string;
  locationName: string;
  navigationName: string;
};

type CourtForm = {
  rowKey: string;
  id: string;
  courtCode: string;
  courtName: string;
  defaultCapacity: string;
  status: VenueStatus;
  originalStatus: VenueStatus;
  isNew: boolean;
};

type VenueCourtManagementPageData = {
  emptyStateHint: string;
  navFallbackUrl: string;
  ownerId: string;
  ownerType: OwnerType;
  pageTopStyle: string;
  selectedVenueIndex: number;
  source: string;
  title: string;
  venueForm: VenueForm;
  venueLabels: string[];
  venues: VenueWithCourts[];
  courts: CourtForm[];
  deletedCourtIds: string[];
};

type InputEvent = WechatMiniprogram.BaseEvent<{ value?: string }>;
type PickerChangeEvent = WechatMiniprogram.BaseEvent<{ value?: string }>;
type DatasetEvent = WechatMiniprogram.BaseEvent<{ field?: string; courtIndex?: number }>;

type ChooseLocationSuccessResult = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

type MiniProgramLocationError = {
  errMsg?: string;
};

type CompatibleWx = WechatMiniprogram.Wx & {
  chooseLocation(options: {
    success(result: ChooseLocationSuccessResult): void;
    fail(error: MiniProgramLocationError): void;
  }): void;
};

const compatibleWx = wx as CompatibleWx;

function getResolvedCurrentUserId(): string {
  return getCurrentUserId() || "";
}

function createTempKey(): string {
  return `temp-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function getDefaultCourtName(courtCode: string): string {
  return /^\d+$/.test(courtCode) ? `${courtCode} 号场` : `${courtCode} 场`;
}

function getEmptyVenueForm(): VenueForm {
  return {
    venueId: "",
    isNew: true,
    name: "",
    shortName: "",
    province: "",
    city: "",
    district: "",
    address: "",
    latitude: "",
    longitude: "",
    locationName: "",
    navigationName: "",
  };
}

function buildVenueForm(snapshot?: VenueWithCourts): VenueForm {
  if (!snapshot) {
    return getEmptyVenueForm();
  }

  return {
    venueId: snapshot.venue.id,
    isNew: false,
    name: snapshot.venue.name,
    shortName: snapshot.venue.shortName,
    province: snapshot.venue.province,
    city: snapshot.venue.city,
    district: snapshot.venue.district,
    address: snapshot.venue.address,
    latitude: snapshot.venue.latitude ? `${snapshot.venue.latitude}` : "",
    longitude: snapshot.venue.longitude ? `${snapshot.venue.longitude}` : "",
    locationName: snapshot.venue.navigationName || snapshot.venue.name,
    navigationName: snapshot.venue.navigationName,
  };
}

function buildCourts(snapshot?: VenueWithCourts): CourtForm[] {
  if (!snapshot) {
    return [];
  }

  return snapshot.courts
    .filter((court) => court.status === "ACTIVE")
    .map((court) => ({
      rowKey: court.id,
      id: court.id,
      courtCode: court.courtCode,
      courtName: court.courtName,
      defaultCapacity: court.defaultCapacity ? `${court.defaultCapacity}` : "",
      status: "ACTIVE",
      originalStatus: "ACTIVE",
      isNew: false,
    }));
}

Page({
  data: {
    emptyStateHint: "先创建一个场馆，再补充场地号和默认人数。",
    navFallbackUrl: "/pages/profile/index",
    ownerId: "",
    ownerType: "CLUB",
    pageTopStyle: "",
    selectedVenueIndex: 0,
    source: "profile",
    title: "场馆与场地管理",
    venueForm: getEmptyVenueForm(),
    venueLabels: [],
    venues: [],
    courts: buildCourts(),
    deletedCourtIds: [],
  } as VenueCourtManagementPageData,

  onLoad(options: Record<string, string | undefined>): void {
    this.syncPageChrome();
    const source =
      typeof options.source === "string" && options.source.length > 0
        ? decodeURIComponent(options.source)
        : "profile";
    const ownerType = options.ownerType === "PERSONAL" ? "PERSONAL" : "CLUB";
    const ownerId =
      typeof options.ownerId === "string" && options.ownerId.length > 0
        ? decodeURIComponent(options.ownerId)
        : "";

    void this.bootstrapPage(source, ownerType, ownerId);
  },

  onShow(): void {
    this.syncPageChrome();
  },

  syncPageChrome(): void {
    this.setData({
      pageTopStyle: getPageTopStyle(16),
    });
  },

  async bootstrapPage(source: string, ownerType: OwnerType, ownerId: string): Promise<void> {
    const canContinue = await ensureAuthenticated();

    if (!canContinue) {
      return;
    }

    const resolvedOwnerId = await this.resolveOwnerId(ownerType, ownerId, source);

    if (!resolvedOwnerId) {
      return;
    }

    await this.refreshPage(source, ownerType, resolvedOwnerId);
  },

  async resolveOwnerId(
    ownerType: OwnerType,
    ownerId: string,
    source: string
  ): Promise<string> {
    if (ownerType === "PERSONAL") {
      return ownerId || getResolvedCurrentUserId();
    }

    if (ownerId) {
      return ownerId;
    }

    try {
      await fetchOwnedClubs(getResolvedCurrentUserId());
    } catch (error) {
      this.showError(error);
    }

    const ownedClubId = listOwnedClubs(getResolvedCurrentUserId())[0]?.id ?? "";

    if (!ownedClubId) {
      wx.redirectTo({
        url: `/pages/club-register/index?source=${encodeURIComponent(source)}`,
      });
    }

    return ownedClubId;
  },

  async refreshPage(
    source: string,
    ownerType: OwnerType,
    ownerId: string,
    preferredVenueId = ""
  ): Promise<void> {
    try {
      const venues = await fetchVenuesForOwner(ownerType, ownerId);
      const selectedVenueIndex = Math.max(
        venues.findIndex((item) => item.venue.id === preferredVenueId),
        venues.length > 0 ? 0 : -1
      );
      const selectedVenue = selectedVenueIndex >= 0 ? venues[selectedVenueIndex] : undefined;

      this.setData({
        emptyStateHint:
          ownerType === "CLUB"
            ? "场馆会同步给俱乐部发布活动时选择。"
            : "个人场馆只会出现在你的个人主体下。",
        navFallbackUrl: resolveOwningTab("/pages/venue-court-management/index", source),
        ownerId,
        ownerType,
        selectedVenueIndex,
        source,
        title: ownerType === "CLUB" ? "俱乐部场馆管理" : "个人场馆管理",
        venueForm: buildVenueForm(selectedVenue),
        venueLabels: venues.map((item) => item.venue.name),
        venues,
        courts: buildCourts(selectedVenue),
        deletedCourtIds: [],
      });
    } catch (error) {
      this.showError(error);
    }
  },

  handleVenueChange(event: PickerChangeEvent): void {
    const selectedVenueIndex = Number(event.detail.value ?? 0);
    const selectedVenue = this.data.venues[selectedVenueIndex];

    if (!selectedVenue) {
      return;
    }

    this.setData({
      selectedVenueIndex,
      venueForm: buildVenueForm(selectedVenue),
      courts: buildCourts(selectedVenue),
      deletedCourtIds: [],
    });
  },

  handleCreateVenue(): void {
    this.setData({
      selectedVenueIndex: -1,
      venueForm: getEmptyVenueForm(),
      courts: buildCourts(),
      deletedCourtIds: [],
    });
  },

  handleInput(event: InputEvent & DatasetEvent): void {
    const field = event.currentTarget.dataset.field;
    const value = typeof event.detail.value === "string" ? event.detail.value : "";

    if (!field) {
      return;
    }

    this.setData({
      [`venueForm.${field}`]: value,
    } as never);
  },

  handleCourtInput(event: InputEvent & DatasetEvent): void {
    const courtIndex = Number(event.currentTarget.dataset.courtIndex);
    const field = event.currentTarget.dataset.field;
    const value = typeof event.detail.value === "string" ? event.detail.value : "";
    const targetCourt = this.data.courts[courtIndex];

    if (!field || !targetCourt) {
      return;
    }

    this.setData({
      [`courts[${courtIndex}].${field}`]: value,
    } as never);
  },

  handleAddCourt(): void {
    this.setData({
      courts: [
        ...this.data.courts,
        {
          rowKey: createTempKey(),
        id: "",
        courtCode: "",
        courtName: "",
        defaultCapacity: "",
        status: "ACTIVE",
        originalStatus: "ACTIVE",
          isNew: true,
        },
      ],
    });
  },

  handleRemoveCourt(event: DatasetEvent): void {
    const courtIndex = Number(event.currentTarget.dataset.courtIndex);
    const court = this.data.courts[courtIndex];

    if (!court) {
      return;
    }

    const nextCourts = this.data.courts.filter((_, index) => index !== courtIndex);

    this.setData({
      deletedCourtIds: court.isNew ? this.data.deletedCourtIds : [...this.data.deletedCourtIds, court.id],
      courts: nextCourts,
    });
  },

  handleChooseLocation(): void {
    compatibleWx.chooseLocation({
      success: (result: ChooseLocationSuccessResult) => {
        this.setData({
          "venueForm.address": result.address || "",
          "venueForm.latitude": `${result.latitude}`,
          "venueForm.longitude": `${result.longitude}`,
          "venueForm.locationName": result.name || "",
        } as never);
      },
      fail: (error: MiniProgramLocationError) => {
        if (!(error.errMsg ?? "").includes("cancel")) {
          this.showError(error);
        }
      },
    });
  },

  async handleSubmit(): Promise<void> {
    const venueForm = this.data.venueForm;
    const activeCourts = this.data.courts.filter((court) => court.courtCode.trim());

    if (!venueForm.name.trim()) {
      this.showError(new Error("请填写场馆名称"));
      return;
    }

    if (!venueForm.address.trim()) {
      this.showError(new Error("请填写场馆详细地址"));
      return;
    }

    if (activeCourts.length === 0) {
      this.showError(new Error("请至少保留一片场地"));
      return;
    }

    try {
      let venueId = venueForm.venueId;

      if (venueForm.isNew) {
        const createdVenue = await createVenue({
          ownerType: this.data.ownerType,
          ownerId: this.data.ownerId,
          name: venueForm.name,
          shortName: venueForm.shortName,
          province: "",
          city: "",
          district: "",
          address: venueForm.address,
          latitude: Number(venueForm.latitude || "0") || undefined,
          longitude: Number(venueForm.longitude || "0") || undefined,
          navigationName: venueForm.locationName || venueForm.name,
          courtCodes: activeCourts.map((court) => court.courtCode.trim()),
        });

        venueId = createdVenue.venue.id;

        for (const court of activeCourts) {
          const createdCourt = createdVenue.courts.find(
            (item) => item.courtCode === court.courtCode.trim()
          );

          if (!createdCourt) {
            continue;
          }

          const expectedName = court.courtName.trim() || getDefaultCourtName(court.courtCode.trim());
          const expectedCapacity = Number(court.defaultCapacity || "0") || undefined;

          if (
            expectedName !== createdCourt.courtName ||
            (expectedCapacity ?? null) !== (createdCourt.defaultCapacity ?? null)
          ) {
            await updateVenueCourt({
              courtId: createdCourt.id,
              courtCode: createdCourt.courtCode,
              courtName: expectedName,
              defaultCapacity: expectedCapacity,
            });
          }
        }
      } else {
        await updateVenue({
          venueId: venueForm.venueId,
          name: venueForm.name,
          shortName: venueForm.shortName,
          province: "",
          city: "",
          district: "",
          address: venueForm.address,
          latitude: Number(venueForm.latitude || "0") || undefined,
          longitude: Number(venueForm.longitude || "0") || undefined,
          navigationName: venueForm.locationName || venueForm.name,
        });

        for (const court of this.data.courts) {
          if (court.isNew && court.courtCode.trim()) {
            await createVenueCourt({
              venueId: venueForm.venueId,
              courtCode: court.courtCode.trim(),
              courtName: court.courtName.trim() || getDefaultCourtName(court.courtCode.trim()),
              defaultCapacity: Number(court.defaultCapacity || "0") || undefined,
            });
            continue;
          }

          if (!court.isNew) {
            await updateVenueCourt({
              courtId: court.id,
              courtCode: court.courtCode.trim(),
              courtName: court.courtName.trim() || getDefaultCourtName(court.courtCode.trim()),
              defaultCapacity: Number(court.defaultCapacity || "0") || undefined,
            });
          }
        }

        for (const courtId of this.data.deletedCourtIds) {
          await deactivateVenueCourt(courtId);
        }
      }

      await this.refreshPage(this.data.source, this.data.ownerType, this.data.ownerId, venueId);

      wx.showToast({
        title: "场馆配置已保存",
        icon: "success",
      });
    } catch (error) {
      this.showError(error);
    }
  },

  showError(error: unknown): void {
    wx.showToast({
      title: error instanceof Error ? error.message : "操作失败，请稍后重试",
      icon: "none",
    });
  },
});
