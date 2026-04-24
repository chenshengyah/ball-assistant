import { uploadImageAsset } from "../../services/asset-service";
import { createOrUpdateClub, fetchOwnedClubs, getOwnedClubById } from "../../services/club-service";
import { ensureAuthenticated } from "../../services/auth";
import { getPageTopStyle } from "../../utils/chrome";
import { resolveOwningTab } from "../../utils/navigation";

type ClubRegisterForm = {
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

type ClubRegisterPageData = {
  form: ClubRegisterForm;
  navFallbackUrl: string;
  pageTopStyle: string;
  source: string;
  subtitle: string;
  submitText: string;
  title: string;
};

type InputEvent = WechatMiniprogram.BaseEvent<{ value?: string }>;
type DatasetEvent = WechatMiniprogram.BaseEvent<{ field?: string }>;

type ChooseMediaSuccessResult = {
  tempFiles?: Array<{
    tempFilePath?: string;
  }>;
};

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
  chooseMedia(options: {
    count: number;
    mediaType: string[];
    sizeType: string[];
    sourceType: string[];
    success(result: ChooseMediaSuccessResult): void;
    fail(error: MiniProgramLocationError): void;
  }): void;
  chooseLocation(options: {
    success(result: ChooseLocationSuccessResult): void;
    fail(error: MiniProgramLocationError): void;
  }): void;
};

const CURRENT_USER_ID = "user-current";
const compatibleWx = wx as CompatibleWx;

function getEmptyForm(): ClubRegisterForm {
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

function getCopy(source: string, hasClubId: boolean): Pick<
  ClubRegisterPageData,
  "subtitle" | "submitText" | "title"
> {
  if (source === "activity-create") {
    return {
      title: hasClubId ? "完善俱乐部资料" : "创建俱乐部主体",
      subtitle: "完成后会回到创建活动，继续选择俱乐部身份和场馆。",
      submitText: hasClubId ? "保存并返回创建活动" : "创建并返回创建活动",
    };
  }

  return {
    title: hasClubId ? "俱乐部资料" : "创建俱乐部",
    subtitle: "从我的入口创建或完善俱乐部资料，后续可继续管理场馆与场地。",
    submitText: hasClubId ? "保存并进入俱乐部管理" : "创建并进入俱乐部管理",
  };
}

function buildForm(clubId = ""): ClubRegisterForm {
  const club = getOwnedClubById(CURRENT_USER_ID, clubId);

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
    form: getEmptyForm(),
    navFallbackUrl: "/pages/profile/index",
    pageTopStyle: "",
    source: "profile",
    subtitle: "从我的入口创建或完善俱乐部资料，后续可继续管理场馆与场地。",
    submitText: "创建并进入俱乐部管理",
    title: "创建俱乐部",
  } as ClubRegisterPageData,

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
  },

  syncPageChrome(): void {
    this.setData({
      pageTopStyle: getPageTopStyle(16),
    });
  },

  async bootstrapPage(source: string, clubId: string): Promise<void> {
    const canContinue = await ensureAuthenticated();

    if (!canContinue) {
      return;
    }

    try {
      await fetchOwnedClubs(CURRENT_USER_ID);
    } catch {
      // Fall back to local snapshot if the API is temporarily unavailable.
    }

    const copy = getCopy(source, Boolean(clubId));

    this.setData({
      form: buildForm(clubId),
      navFallbackUrl: resolveOwningTab("/pages/club-register/index", source),
      source,
      subtitle: copy.subtitle,
      submitText: copy.submitText,
      title: copy.title,
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

  async pickSingleImage(): Promise<string> {
    return new Promise((resolve, reject) => {
      compatibleWx.chooseMedia({
        count: 1,
        mediaType: ["image"],
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
        success: (result: ChooseMediaSuccessResult) => {
          resolve(result.tempFiles?.[0]?.tempFilePath ?? "");
        },
        fail: (error: MiniProgramLocationError) => {
          if ((error.errMsg ?? "").includes("cancel")) {
            resolve("");
            return;
          }

          reject(error);
        },
      });
    });
  },

  async handleUploadCover(): Promise<void> {
    try {
      const filePath = await this.pickSingleImage();

      if (!filePath) {
        return;
      }

      const uploaded = await uploadImageAsset(filePath, "club-cover");

      this.setData({
        "form.coverUrl": uploaded.assetUrl,
      } as never);
    } catch (error) {
      this.showError(error);
    }
  },

  async handleUploadLogo(): Promise<void> {
    try {
      const filePath = await this.pickSingleImage();

      if (!filePath) {
        return;
      }

      const uploaded = await uploadImageAsset(filePath, "club-logo");

      this.setData({
        "form.logoUrl": uploaded.assetUrl,
      } as never);
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
        clubId: this.data.form.clubId || undefined,
        currentUserId: CURRENT_USER_ID,
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

      wx.showToast({
        title: this.data.form.clubId ? "已保存" : "俱乐部已创建",
        icon: "success",
      });

      if (this.data.source === "activity-create") {
        if (getCurrentPages().length > 1) {
          wx.navigateBack();
          return;
        }

        wx.redirectTo({
          url: "/pages/activity-create/index",
        });
        return;
      }

      wx.redirectTo({
        url: `/pages/club-management/index?source=${encodeURIComponent(
          this.data.source || "profile"
        )}&clubId=${encodeURIComponent(nextClub.id)}`,
      });
    } catch (error) {
      this.showError(error);
    }
  },

  showError(error: unknown): void {
    wx.showToast({
      title: error instanceof Error ? error.message : "保存失败，请稍后重试",
      icon: "none",
    });
  },
});
