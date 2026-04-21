import { getChromeMetrics } from "../utils/chrome";

const TAB_ITEMS = [
  {
    text: "首页",
    pagePath: "pages/home/index",
    icon: "home",
  },
  {
    text: "活动",
    pagePath: "pages/activity/index",
    icon: "activity",
  },
  {
    text: "我的",
    pagePath: "pages/profile/index",
    icon: "profile",
  },
];

type TabItem = (typeof TAB_ITEMS)[number];

type CustomTabBarData = {
  list: readonly TabItem[];
  selected: number;
  tabBarStyle: string;
};

type TabChangeEvent = WechatMiniprogram.BaseEvent<{
  path?: string;
}>;

type CustomTabBarMethods = {
  syncChromeMetrics(): void;
  switchTab(event: TabChangeEvent): void;
  updateSelected(): void;
};

Component<CustomTabBarData, CustomTabBarMethods>({
  data: {
    list: TAB_ITEMS,
    selected: 0,
    tabBarStyle: "",
  },

  lifetimes: {
    attached(): void {
      this.syncChromeMetrics();
      this.updateSelected();
    },
  },

  pageLifetimes: {
    show(): void {
      this.syncChromeMetrics();
      this.updateSelected();
    },
  },

  methods: {
    syncChromeMetrics(): void {
      const metrics = getChromeMetrics();

      this.setData({
        tabBarStyle: `height:${80 + metrics.tabBarBottomInset}px;padding:12px 16px ${8 + metrics.tabBarBottomInset}px;`,
      });
    },

    updateSelected(): void {
      const currentPage = getCurrentPages().slice(-1)[0];

      if (!currentPage) {
        return;
      }

      const currentRoute = currentPage.route;
      const selected = this.data.list.findIndex(
        (item) => item.pagePath === currentRoute
      );

      if (selected >= 0 && selected !== this.data.selected) {
        this.setData({ selected });
      }
    },

    switchTab(event: TabChangeEvent): void {
      const path = event.currentTarget.dataset.path;

      if (typeof path !== "string" || path.length === 0) {
        return;
      }

      if (this.data.list[this.data.selected]?.pagePath === path) {
        return;
      }

      wx.switchTab({
        url: `/${path}`,
      });
    },
  },
});
