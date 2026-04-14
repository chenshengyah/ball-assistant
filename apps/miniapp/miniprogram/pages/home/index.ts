import { requireCompleteProfile } from "../../services/auth";
import { listActivities } from "../../services/activity-service";
import type { ActivityView } from "../../types/activity";
import { getChromeMetrics } from "../../utils/chrome";

type Category = {
  id: string;
  label: string;
};

type ActivityCard = {
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
  activities: ActivityCard[];
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
  visibleActivities: ActivityCard[];
};

type CategoryTapEvent = WechatMiniprogram.BaseEvent<{
  categoryId?: string;
}>;

type SearchInputEvent = WechatMiniprogram.BaseEvent<{
  value?: string;
}>;

type ActivityTapEvent = WechatMiniprogram.BaseEvent<{
  activityId?: string;
}>;

const CATEGORIES: Category[] = [
  { id: "all", label: "全部" },
  { id: "badminton", label: "羽毛球" },
];

const COVER_IMAGES = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCiPmqq3UBc4sETlMa2utxZU7iUvxixkpu4Tdsh47B6MhqE0e34rL_RXbxhr_YmRuo-KTdLcrCVkcNfCirap2BKTaqgOXP9koJ2MR344pUcxjO0uVa0Sf-cGDSaoyEjEW2RsmXCcBQAUTncSWwBB5lGaJvIPQHdLVW717yl7nuAmnoNtitCLHK4AIsTyUHzpBRHbFJ0jsj1zDC4nXj6MoNb1hMdUXJP4RdSaUd9FNAmBWOdZnrroFmFWTKZNVckUMLuUk4Kvyc0Ew",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA9iPQWgyoYsN3OnXb5Q8Czoj126WzcrfO-KLc4HW7BBir-cwt0r63CzPwHytgaUVuJcTJaAJ5F14oYsAHTYpToQRwdZWQ4muQ02AL_ANMwPpaf7HeTW3F0av2xj2XuAgL2G4YlrWJo9hj5PWedbjVHRDNI1p480iN9WflEbUR0TUUIX3cByX-UNXeE-BQEohZLK9kQeqyzseZDq_KF_O0LkUI9jhOIqlzSBAMj8dNisHraVoeZmGuDFR4aB4GeROXIk8-8XPrXpQ",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCiPmqq3UBc4sETlMa2utxZU7iUvxixkpu4Tdsh47B6MhqE0e34rL_RXbxhr_YmRuo-KTdLcrCVkcNfCirap2BKTaqgOXP9koJ2MR344pUcxjO0uVa0Sf-cGDSaoyEjEW2RsmXCcBQAUTncSWwBB5lGaJvIPQHdLVW717yl7nuAmnoNtitCLHK4AIsTyUHzpBRHbFJ0jsj1zDC4nXj6MoNb1hMdUXJP4RdSaUd9FNAmBWOdZnrroFmFWTKZNVckUMLuUk4Kvyc0Ew",
];

function toHomeCard(activity: ActivityView, index: number): ActivityCard {
  const avatars =
    activity.registrations.length > 0
      ? activity.registrations.slice(0, 3).map((registration) => registration.avatarColor)
      : ["#cfd2ff", "#a7b0ff", "#f5c7ea"];

  return {
    id: activity.id,
    categoryId: "badminton",
    badge: activity.ownerLabel,
    badgeTone: activity.ownerType === "CLUB" ? "primary" : "tertiary",
    coverImageUrl: COVER_IMAGES[index % COVER_IMAGES.length],
    location: activity.venueLabel,
    priceText: activity.chargeText,
    priceTone: activity.chargeText === "免费" ? "success" : "primary",
    schedule: activity.scheduleText,
    title: activity.title,
    actionText: "查看详情",
    participants: `${activity.confirmedCount + activity.waitlistCount} 人已报名`,
    avatars,
  };
}

Page({
  data: {
    activities: [],
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
    visibleActivities: [],
  } as HomePageData,

  onLoad(): void {
    this.syncChromeMetrics();
    this.hydrateActivities();
  },

  onShow(): void {
    this.syncChromeMetrics();
    this.hydrateActivities();
  },

  hydrateActivities(): void {
    const activities = listActivities(null).map(toHomeCard);

    this.setData({
      activities,
    });
    this.updateVisibleActivities(this.data.selectedCategory, this.data.searchKeyword, activities);
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

  async handleCreateActivity(): Promise<void> {
    const canContinue = await requireCompleteProfile({
      type: "CREATE_ACTIVITY",
    });

    if (!canContinue) {
      return;
    }

    wx.navigateTo({
      url: "/pages/activity-create/index",
    });
  },

  handlePrimaryAction(event: ActivityTapEvent): void {
    const activityId = event.currentTarget.dataset.activityId;

    if (typeof activityId !== "string" || activityId.length === 0) {
      return;
    }

    wx.navigateTo({
      url: `/pages/activity-detail/index?activityId=${encodeURIComponent(activityId)}`,
    });
  },

  updateVisibleActivities(
    selectedCategory?: string,
    searchKeyword?: string,
    sourceActivities?: ActivityCard[]
  ): void {
    const nextSelectedCategory = selectedCategory ?? this.data.selectedCategory;
    const nextSearchKeyword = searchKeyword ?? this.data.searchKeyword;
    const activities = sourceActivities ?? this.data.activities;
    const normalizedKeyword = nextSearchKeyword.trim().toLowerCase();
    const visibleActivities = activities.filter((activity) => {
      const matchesCategory =
        nextSelectedCategory === "all" || activity.categoryId === nextSelectedCategory;
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
