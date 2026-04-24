import { getChromeMetrics } from "../../utils/chrome";
import { isTabRoute, normalizeRoute } from "../../utils/navigation";

type AppNavData = {
  barStyle: string;
  capsuleStyle: string;
  sideStyle: string;
};

type AppNavMethods = {
  fallbackToRoute(url: string): void;
  handleBack(): void;
  syncChromeMetrics(): void;
};

Component<AppNavData, AppNavMethods>({
  properties: {
    fallbackUrl: {
      type: String,
      value: "/pages/home/index",
    },
    showBack: {
      type: Boolean,
      value: true,
    },
    title: {
      type: String,
      value: "",
    },
  },

  data: {
    barStyle: "",
    capsuleStyle: "",
    sideStyle: "",
  },

  lifetimes: {
    attached(): void {
      this.syncChromeMetrics();
    },
  },

  pageLifetimes: {
    show(): void {
      this.syncChromeMetrics();
    },
  },

  methods: {
    syncChromeMetrics(): void {
      const metrics = getChromeMetrics();
      const sideWidth = Math.max(metrics.menuButtonRect.width, 44);

      this.setData({
        barStyle: `height:${metrics.navBarHeight}px;padding:${metrics.statusBarHeight}px 16px 0;`,
        capsuleStyle: `width:${metrics.menuButtonRect.width}px;height:${metrics.menuButtonRect.height}px;`,
        sideStyle: `width:${sideWidth}px;height:${metrics.menuButtonRect.height}px;`,
      });
    },

    handleBack(): void {
      const showBack = Boolean(this.properties.showBack);

      if (!showBack) {
        return;
      }

      const fallbackUrl =
        typeof this.properties.fallbackUrl === "string" ? this.properties.fallbackUrl : "";

      if (getCurrentPages().length > 1) {
        wx.navigateBack();
        return;
      }

      this.fallbackToRoute(fallbackUrl);
    },

    fallbackToRoute(url: string): void {
      if (!url) {
        return;
      }

      const normalizedUrl = normalizeRoute(url);

      if (isTabRoute(normalizedUrl)) {
        wx.switchTab({
          url: normalizedUrl,
        });
        return;
      }

      wx.redirectTo({
        url: normalizedUrl,
      });
    },
  },
});
