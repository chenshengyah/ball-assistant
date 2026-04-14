import { bootstrapAuth } from "./services/auth";

interface IAppOption {
  globalData?: {
    env: string;
  };
  [key: string]: unknown;
}

App<IAppOption>({
  onLaunch(): void {
    this.globalData = {
      env: "",
    };

    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
      return;
    }

    wx.cloud.init({
      env: this.globalData.env,
      traceUser: true,
    });

    void bootstrapAuth();
  },
});
