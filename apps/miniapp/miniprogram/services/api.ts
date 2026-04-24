import { miniappRuntimeEnvironment } from "../config/env";

function normalizeApiBaseUrl(apiBaseUrl: string): string {
  return apiBaseUrl.replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  return normalizeApiBaseUrl(miniappRuntimeEnvironment.apiBaseUrl);
}

export function requestApi<T>(params: {
  path: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  data?: unknown;
  headers?: Record<string, string>;
}): Promise<T> {
  const { path, method = "GET", data, headers } = params;
  const apiBaseUrl = getApiBaseUrl();

  if (!/^https?:\/\//.test(apiBaseUrl)) {
    return Promise.reject(
      new Error(
        `未配置可用的 API 地址，请先生成或更新 miniprogram/config/private.ts。可通过 MINIAPP_PRODUCTION_API_BASE_URL 等环境变量执行 miniapp:env:production 或 miniapp:env:local。当前环境：${miniappRuntimeEnvironment.currentEnv}`
      )
    );
  }

  return new Promise((resolve, reject) => {
    wx.request<T>({
      url: `${apiBaseUrl}${path}`,
      method,
      data,
      header: headers,
      success: (result) => {
        if (result.statusCode >= 200 && result.statusCode < 300) {
          resolve(result.data);
          return;
        }

        const payload = result.data as
          | {
              message?: string | string[];
              error?: string;
            }
          | string
          | undefined;
        const message =
          typeof payload === "string"
            ? payload
            : Array.isArray(payload?.message)
              ? payload.message.join("，")
              : payload?.message || payload?.error || `请求失败：${result.statusCode}`;

        reject(new Error(message));
      },
      fail: (error) => {
        reject(error);
      },
    });
  });
}
