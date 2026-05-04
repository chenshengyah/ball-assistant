import { getApiBaseUrl } from "./api";
import { getAccessToken } from "./auth";

export type UploadScene =
  | "activity-cover"
  | "activity-detail"
  | "club-cover"
  | "club-logo"
  | "user-avatar";

type UploadImageResponse = {
  assetKey: string;
  assetUrl: string;
  mimeType: string;
};

type UploadErrorPayload =
  | {
      message?: string | string[];
      error?: string;
    }
  | string;

const IMAGE_QUALITY_BY_SCENE: Record<UploadScene, number> = {
  "activity-cover": 82,
  "activity-detail": 78,
  "club-cover": 82,
  "club-logo": 70,
  "user-avatar": 68,
};

const IMAGE_MAX_WIDTH_BY_SCENE: Partial<Record<UploadScene, number>> = {
  "activity-cover": 1600,
  "activity-detail": 1400,
  "club-cover": 1600,
  "club-logo": 800,
  "user-avatar": 720,
};

type PickImageResult = {
  filePath: string;
  cancelled: boolean;
};

function pickSingleImage(): Promise<PickImageResult> {
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: (result) => {
        const filePath = result.tempFiles?.[0]?.tempFilePath ?? "";

        if (!filePath) {
          reject(new Error("未获取到图片，请重试"));
          return;
        }

        resolve({ filePath, cancelled: false });
      },
      fail: (error) => {
        if ((error.errMsg ?? "").includes("cancel")) {
          resolve({ filePath: "", cancelled: true });
          return;
        }

        reject(error);
      },
    });
  });
}

function compressImage(filePath: string, scene: UploadScene): Promise<string> {
  return new Promise((resolve) => {
    wx.compressImage({
      src: filePath,
      quality: IMAGE_QUALITY_BY_SCENE[scene],
      compressedWidth: IMAGE_MAX_WIDTH_BY_SCENE[scene],
      success: (result) => {
        resolve(result.tempFilePath || filePath);
      },
      fail: () => {
        resolve(filePath);
      },
    });
  });
}

function normalizeAssetUrl(assetUrl: string): string {
  const normalizedAssetUrl = assetUrl.trim();

  if (!normalizedAssetUrl || /^https?:\/\//.test(normalizedAssetUrl)) {
    return normalizedAssetUrl;
  }

  const apiBaseUrl = getApiBaseUrl();

  if (normalizedAssetUrl.startsWith("/")) {
    const apiOrigin = apiBaseUrl.replace(/\/api\/?$/, "");

    return `${apiOrigin}${normalizedAssetUrl}`;
  }

  return `${apiBaseUrl}/${normalizedAssetUrl.replace(/^\/+/, "")}`;
}

function normalizeUploadResponse(response: UploadImageResponse): UploadImageResponse {
  return {
    ...response,
    assetUrl: normalizeAssetUrl(response.assetUrl),
  };
}

export async function compressAndUploadImageAsset(
  filePath: string,
  scene: UploadScene
): Promise<UploadImageResponse> {
  const compressedFilePath = await compressImage(filePath, scene);

  return uploadImageAsset(compressedFilePath, scene);
}

export function uploadImageAsset(filePath: string, scene: UploadScene): Promise<UploadImageResponse> {
  const accessToken = getAccessToken();
  const apiBaseUrl = getApiBaseUrl();

  if (!accessToken) {
    return Promise.reject(new Error("请先登录后再上传图片"));
  }

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${apiBaseUrl}/assets/images`,
      filePath,
      name: "file",
      formData: {
        scene,
      },
      header: {
        Authorization: `Bearer ${accessToken}`,
      },
      success: (result) => {
        if (result.statusCode < 200 || result.statusCode >= 300) {
          let message = `图片上传失败：${result.statusCode}`;

          try {
            const payload = JSON.parse(result.data) as UploadErrorPayload;

            if (typeof payload === "string") {
              message = payload;
            } else if (Array.isArray(payload.message)) {
              message = payload.message.join("，");
            } else if (payload.message || payload.error) {
              message = payload.message || payload.error || message;
            }
          } catch {
            // Keep the status-based message if the backend did not return JSON.
          }

          reject(new Error(message));
          return;
        }

        try {
          const parsed = JSON.parse(result.data) as UploadImageResponse;
          resolve(normalizeUploadResponse(parsed));
        } catch {
          reject(new Error("图片上传返回格式不正确"));
        }
      },
      fail: (error) => {
        reject(error);
      },
    });
  });
}

export async function pickCompressAndUploadImageAsset(
  scene: UploadScene
): Promise<UploadImageResponse | null> {
  const picked = await pickSingleImage();

  if (picked.cancelled || !picked.filePath) {
    return null;
  }

  return compressAndUploadImageAsset(picked.filePath, scene);
}
