import { getApiBaseUrl } from "./api";
import { getAccessToken } from "./auth";

type UploadScene = "activity-cover" | "activity-detail" | "club-cover" | "club-logo";

type UploadImageResponse = {
  assetKey: string;
  assetUrl: string;
  mimeType: string;
};

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
          reject(new Error("图片上传失败，请稍后重试"));
          return;
        }

        try {
          const parsed = JSON.parse(result.data) as UploadImageResponse;
          resolve(parsed);
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
