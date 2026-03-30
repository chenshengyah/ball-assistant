import { getChromeMetrics } from "../../utils/chrome";

type Category = {
  id: string;
  label: string;
};

type Activity = {
  id: string;
  categoryId: string;
  badge: string;
  badgeTone: "primary" | "tertiary";
  coverImageUrl: string;
  location: string;
  priceText: string;
  priceTone: "primary" | "success";
  schedule: string;
  title: string;
  actionText: string;
  participants: string;
  avatars: string[];
};

type MenuButtonRectLike = {
  bottom: number;
  height: number;
  width: number;
};

type HomePageData = {
  activities: Activity[];
  categories: Category[];
  capsuleStyle: string;
  categoryStripStyle: string;
  fabStyle: string;
  homeContentStyle: string;
  homeTopbarStyle: string;
  menuButtonRect: MenuButtonRectLike;
  navBarHeight: number;
  pageBottomPadding: number;
  searchKeyword: string;
  selectedCategory: string;
  statusBarHeight: number;
  tabBarBottomInset: number;
  visibleActivities: Activity[];
};

type CategoryTapEvent = WechatMiniprogram.BaseEvent<{
  categoryId?: string;
}>;

type SearchInputEvent = WechatMiniprogram.BaseEvent<{
  value?: string;
}>;

type ActionTapEvent = WechatMiniprogram.BaseEvent<{
  title?: string;
}>;

const CATEGORIES: Category[] = [
  { id: "all", label: "全部" },
  { id: "badminton", label: "羽毛球" },
  // { id: "running", label: "跑步" },
  // { id: "tennis", label: "网球" },
  // { id: "community", label: "社群" },
];

const ACTIVITIES: Activity[] = [
  {
    id: "badminton-doubles",
    categoryId: "badminton",
    badge: "高人气组局",
    badgeTone: "primary",
    coverImageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCiPmqq3UBc4sETlMa2utxZU7iUvxixkpu4Tdsh47B6MhqE0e34rL_RXbxhr_YmRuo-KTdLcrCVkcNfCirap2BKTaqgOXP9koJ2MR344pUcxjO0uVa0Sf-cGDSaoyEjEW2RsmXCcBQAUTncSWwBB5lGaJvIPQHdLVW717yl7nuAmnoNtitCLHK4AIsTyUHzpBRHbFJ0jsj1zDC4nXj6MoNb1hMdUXJP4RdSaUd9FNAmBWOdZnrroFmFWTKZNVckUMLuUk4Kvyc0Ew",
    location: "浦东金桥羽毛球馆",
    priceText: "¥119",
    priceTone: "primary",
    schedule: "周六 19:30",
    title: "周末羽毛球双打局：4v4 进阶对抗",
    actionText: "预约",
    participants: "24 Joined",
    avatars: ["#cfd2ff", "#a7b0ff", "#f5c7ea"],
  },
  {
    id: "night-run",
    categoryId: "running",
    badge: "训练社群",
    badgeTone: "tertiary",
    coverImageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA9iPQWgyoYsN3OnXb5Q8Czoj126WzcrfO-KLc4HW7BBir-cwt0r63CzPwHytgaUVuJcTJaAJ5F14oYsAHTYpToQRwdZWQ4muQ02AL_ANMwPpaf7HeTW3F0av2xj2XuAgL2G4YlrWJo9hj5PWedbjVHRDNI1p480iN9WflEbUR0TUUIX3cByX-UNXeE-BQEohZLK9kQeqyzseZDq_KF_O0LkUI9jhOIqlzSBAMj8dNisHraVoeZmGuDFR4aB4GeROXIk8-8XPrXpQ",
    location: "徐汇滨江跑步道",
    priceText: "FREE",
    priceTone: "success",
    schedule: "周日 20:00",
    title: "城市夜跑训练营：10K 配速提升",
    actionText: "报名",
    participants: "89 Joined",
    avatars: ["#cfd2ff", "#8f98f2", "#e1b3ff"],
  },
  {
    id: "tennis-starter",
    categoryId: "tennis",
    badge: "新手友好",
    badgeTone: "primary",
    coverImageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCiPmqq3UBc4sETlMa2utxZU7iUvxixkpu4Tdsh47B6MhqE0e34rL_RXbxhr_YmRuo-KTdLcrCVkcNfCirap2BKTaqgOXP9koJ2MR344pUcxjO0uVa0Sf-cGDSaoyEjEW2RsmXCcBQAUTncSWwBB5lGaJvIPQHdLVW717yl7nuAmnoNtitCLHK4AIsTyUHzpBRHbFJ0jsj1zDC4nXj6MoNb1hMdUXJP4RdSaUd9FNAmBWOdZnrroFmFWTKZNVckUMLuUk4Kvyc0Ew",
    location: "静安体育中心",
    priceText: "¥88",
    priceTone: "primary",
    schedule: "周三 18:45",
    title: "网球体验课：发球与底线节奏",
    actionText: "加入",
    participants: "16 Joined",
    avatars: ["#dbddff", "#c5b7ff", "#ffd5ef"],
  },
];

Page<HomePageData>({
  data: {
    activities: ACTIVITIES,
    categories: CATEGORIES,
    capsuleStyle: "",
    categoryStripStyle: "",
    fabStyle: "",
    homeContentStyle: "",
    homeTopbarStyle: "",
    menuButtonRect: {
      bottom: 0,
      height: 0,
      width: 0,
    },
    navBarHeight: 0,
    pageBottomPadding: 0,
    searchKeyword: "",
    selectedCategory: "all",
    statusBarHeight: 0,
    tabBarBottomInset: 0,
    visibleActivities: ACTIVITIES,
  },

  onLoad(): void {
    this.syncChromeMetrics();
    this.updateVisibleActivities();
  },

  onShow(): void {
    this.syncChromeMetrics();
  },

  handleCategoryTap(event: CategoryTapEvent): void {
    const categoryId = event.currentTarget.dataset.categoryId;

    if (typeof categoryId !== "string" || categoryId.length === 0) {
      return;
    }

    this.setData({
      selectedCategory: categoryId,
    });
    this.updateVisibleActivities(categoryId, this.data.searchKeyword);
  },

  handleSearchChange(event: SearchInputEvent): void {
    const keyword =
      typeof event.detail.value === "string" ? event.detail.value.trim() : "";

    this.setData({
      searchKeyword: keyword,
    });
    this.updateVisibleActivities(this.data.selectedCategory, keyword);
  },

  handleFilterTap(): void {
    wx.showToast({
      title: "筛选功能建设中",
      icon: "none",
    });
  },

  handleCreateActivity(): void {
    wx.navigateTo({
      url: "/pages/activity-create/index",
    });
  },

  handlePrimaryAction(event: ActionTapEvent): void {
    wx.switchTab({
      url: "/pages/activity/index",
    });
  },

  updateVisibleActivities(
    selectedCategory = this.data.selectedCategory,
    searchKeyword = this.data.searchKeyword
  ): void {
    const normalizedKeyword = searchKeyword.trim().toLowerCase();
    const visibleActivities = this.data.activities.filter((activity) => {
      const matchesCategory =
        selectedCategory === "all" || activity.categoryId === selectedCategory;
      const searchText = `${activity.title} ${activity.location} ${activity.badge}`
        .toLowerCase()
        .trim();
      const matchesKeyword =
        normalizedKeyword.length === 0 || searchText.includes(normalizedKeyword);

      return matchesCategory && matchesKeyword;
    });

    this.setData({
      visibleActivities,
    });
  },

  syncChromeMetrics(): void {
    const metrics = getChromeMetrics();

    this.setData({
      capsuleStyle: `width:${metrics.menuButtonRect.width}px;height:${metrics.menuButtonRect.height}px;`,
      categoryStripStyle: "margin:24px -24px 0;padding-left:24px;",
      fabStyle: `right:24px;bottom:${metrics.fabBottom}px;`,
      homeContentStyle: `padding:${metrics.contentTopPadding}px 24px ${metrics.pageBottomPadding}px;`,
      homeTopbarStyle: `height:${metrics.navBarHeight}px;padding-top:${metrics.statusBarHeight}px;`,
      menuButtonRect: metrics.menuButtonRect,
      navBarHeight: metrics.navBarHeight,
      pageBottomPadding: metrics.pageBottomPadding,
      statusBarHeight: metrics.statusBarHeight,
      tabBarBottomInset: metrics.tabBarBottomInset,
    });
  },
});
