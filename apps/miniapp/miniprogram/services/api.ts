const API_BASE_URL = "http://127.0.0.1:3000/api";

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

        reject(new Error(`请求失败：${result.statusCode}`));
      },
      fail: (error) => {
        reject(error);
      },
    });
  });
}
