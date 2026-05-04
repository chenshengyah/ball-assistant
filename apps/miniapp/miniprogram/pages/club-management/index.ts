import { pickCompressAndUploadImageAsset } from "../../services/asset-service";
import {
  createOrUpdateClub,
  fetchOwnedClubs,
  listOwnedClubs,
} from "../../services/club-service";
import { ensureAuthenticated, getCurrentUserId } from "../../services/auth";
import { getPageTopStyle } from "../../utils/chrome";
import { resolveOwningTab } from "../../utils/navigation";

type ClubForm = {
  clubId: string;
  name: string;
  coverUrl: string;
  logoUrl: string;
  description: string;
  province: string;
  city: string;
  district: string;
  address: string;
  latitude: string;
  longitude: string;
  locationName: string;
  wechatId: string;
  contactName: string;
  contactPhone: string;
};

type ClubManagementPageData = {
  clubLabels: string[];
  currentClubHint: string;
  form: ClubForm;
  navFallbackUrl: string;
  pageTopStyle: string;
  selectedClubIndex: number;
  source: string;
};

type InputEvent = WechatMiniprogram.BaseEvent<{ value?: string }>;
type DatasetEvent = WechatMiniprogram.BaseEvent<{ field?: string }>;
type PickerChangeEvent = WechatMiniprogram.BaseEvent<{ value?: string }>;

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

function getEmptyForm(): ClubForm {
  return {
    clubId: "",
    name: "",
    coverUrl: "",
    logoUrl: "",
    description: "",
    province: "",
    city: "",
    district: "",
    address: "",
    latitude: "",
    longitude: "",
    locationName: "",
    wechatId: "",
    contactName: "",
    contactPhone: "",
  };
}

function buildForm(clubId: string): ClubForm {
  const club = listOwnedClubs(getResolvedCurrentUserId()).find((item) => item.id === clubId);

  if (!club) {
    return getEmptyForm();
  }

  return {
    clubId: club.id,
    name: club.name,
    coverUrl: club.coverUrl ?? "",
    logoUrl: club.logoUrl ?? "",
    description: club.description ?? "",
    province: club.province ?? "",
    city: club.city ?? "",
    district: club.district ?? "",
    address: club.address ?? "",
    latitude: club.latitude ? `${club.latitude}` : "",
    longitude: club.longitude ? `${club.longitude}` : "",
    locationName: club.name,
    wechatId: club.wechatId ?? "",
    contactName: club.contactName ?? "",
    contactPhone: club.contactPhone ?? "",
  };
}

Page({
  data: {
    clubLabels: [],
    currentClubHint: "管理俱乐部资料和联系人信息。",
    form: getEmptyForm(),
    navFallbackUrl: "/pages/profile/index",
    pageTopStyle: "",
    selectedClubIndex: 0,
    source: "profile",
  } as ClubManagementPageData,

  onLoad(options: Record<string, string | undefined>): void {
    this.syncPageChrome();
    const source =
      typeof options.source === "string" && options.source.length > 0
        ? decodeURIComponent(options.source)
        : "profile";
    const clubId =
      typeof options.clubId === "string" && options.clubId.length > 0
        ? decodeURIComponent(options.clubId)
        : "";

    void this.bootstrapPage(source, clubId);
  },

  onShow(): void {
    this.syncPageChrome();

    if (this.data.form.clubId) {
      void this.refreshOwnedClubs(this.data.source, this.data.form.clubId);
    }
  },

  syncPageChrome(): void {
    this.setData({
      pageTopStyle: getPageTopStyle(16),
    });
  },

  async bootstrapPage(source: string, preferredClubId: string): Promise<void> {
    const canContinue = await ensureAuthenticated();

    if (!canContinue) {
      return;
    }

    await this.refreshOwnedClubs(source, preferredClubId);
  },

  async refreshOwnedClubs(source: string, preferredClubId = ""): Promise<void> {
    try {
      await fetchOwnedClubs(getResolvedCurrentUserId());
    } catch (error) {
      this.showError(error);
    }

    const clubs = listOwnedClubs(getResolvedCurrentUserId());

    if (clubs.length === 0) {
      wx.redirectTo({
        url: `/pages/club-register/index?source=${encodeURIComponent(source)}`,
      });
      return;
    }

    const selectedClubIndex = Math.max(
      clubs.findIndex((club) => club.id === preferredClubId),
      0
    );
    const selectedClub = clubs[selectedClubIndex] ?? clubs[0];

    this.setData({
      clubLabels: clubs.map((club) => club.name),
      currentClubHint: selectedClub.contactPhone
        ? "资料会同步影响创建活动时的俱乐部发布身份。"
        : "先补齐联系人和手机号，后续发布时才能展示对外联系方式。",
      form: buildForm(selectedClub.id),
      navFallbackUrl: resolveOwningTab("/pages/club-management/index", source),
      selectedClubIndex,
      source,
    });
  },

  handleClubChange(event: PickerChangeEvent): void {
    const selectedClubIndex = Number(event.detail.value ?? 0);
    const clubs = listOwnedClubs(getResolvedCurrentUserId());
    const selectedClub = clubs[selectedClubIndex];

    if (!selectedClub) {
      return;
    }

    this.setData({
      currentClubHint: selectedClub.contactPhone
        ? "资料会同步影响创建活动时的俱乐部发布身份。"
        : "先补齐联系人和手机号，后续发布时才能展示对外联系方式。",
      form: buildForm(selectedClub.id),
      selectedClubIndex,
    });
  },

  handleInput(event: InputEvent & DatasetEvent): void {
    const field = event.currentTarget.dataset.field;
    const value = typeof event.detail.value === "string" ? event.detail.value : "";

    if (!field) {
      return;
    }

    this.setData({
      [`form.${field}`]: value,
    } as never);
  },

  async handleUploadCover(): Promise<void> {
    try {
      const uploaded = await pickCompressAndUploadImageAsset("club-cover");

      if (uploaded) {
        this.setData({
          "form.coverUrl": uploaded.assetUrl,
        } as never);
      }
    } catch (error) {
      this.showError(error);
    }
  },

  async handleUploadLogo(): Promise<void> {
    try {
      const uploaded = await pickCompressAndUploadImageAsset("club-logo");

      if (uploaded) {
        this.setData({
          "form.logoUrl": uploaded.assetUrl,
        } as never);
      }
    } catch (error) {
      this.showError(error);
    }
  },

  handleChooseLocation(): void {
    compatibleWx.chooseLocation({
      success: (result: ChooseLocationSuccessResult) => {
        this.setData({
          "form.address": result.address || "",
          "form.latitude": `${result.latitude}`,
          "form.longitude": `${result.longitude}`,
          "form.locationName": result.name || "",
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
    try {
      const nextClub = await createOrUpdateClub({
        clubId: this.data.form.clubId,
        currentUserId: getResolvedCurrentUserId(),
        name: this.data.form.name,
        coverUrl: this.data.form.coverUrl,
        logoUrl: this.data.form.logoUrl,
        description: this.data.form.description,
        province: this.data.form.province,
        city: this.data.form.city,
        district: this.data.form.district,
        address: this.data.form.address,
        latitude: Number(this.data.form.latitude || "0") || undefined,
        longitude: Number(this.data.form.longitude || "0") || undefined,
        wechatId: this.data.form.wechatId,
        contactName: this.data.form.contactName,
        contactPhone: this.data.form.contactPhone,
      });

      await this.refreshOwnedClubs(this.data.source, nextClub.id);

      wx.showToast({
        title: "俱乐部资料已保存",
        icon: "success",
      });
    } catch (error) {
      this.showError(error);
    }
  },

  handleOpenCreateActivity(): void {
    wx.redirectTo({
      url: "/pages/activity-create/index",
    });
  },

  showError(error: unknown): void {
    wx.showToast({
      title: error instanceof Error ? error.message : "操作失败，请稍后重试",
      icon: "none",
    });
  },
});
