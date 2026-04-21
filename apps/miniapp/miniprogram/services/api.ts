// Use the host machine's LAN IP so real-device debugging can reach the local API server.
const API_BASE_URL = "http://192.168.5.49:3000/api";

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export function requestApi<T>(params: {
  path: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  data?: unknown;
  headers?: Record<string, string>;
}): Promise<T> {
  const { path, method = "GET", data, headers } = params;

  return new Promise((resolve, reject) => {
    wx.request<T>({
      url: `${API_BASE_URL}${path}`,
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
