type SafeAreaLike = {
  bottom?: number;
};

type SystemInfoLike = {
  safeArea?: SafeAreaLike;
  screenHeight?: number;
  statusBarHeight?: number;
};

type RawMenuButtonRectLike = Partial<{
  bottom: number;
  height: number;
  width: number;
}>;

export type MenuButtonRectLike = {
  bottom: number;
  height: number;
  width: number;
};

export type ChromeMetrics = {
  contentTopPadding: number;
  fabBottom: number;
  menuButtonRect: MenuButtonRectLike;
  navBarHeight: number;
  pageBottomPadding: number;
  statusBarHeight: number;
  tabBarBottomInset: number;
};

const DEFAULT_STATUS_BAR_HEIGHT = 20;
const DEFAULT_SCREEN_HEIGHT = 812;
const DEFAULT_MENU_WIDTH = 95;
const DEFAULT_MENU_HEIGHT = 32;

export function getChromeMetrics(): ChromeMetrics {
  const systemInfo = wx.getSystemInfoSync() as unknown as SystemInfoLike;
  const rawMenuRect =
    wx.getMenuButtonBoundingClientRect() as unknown as RawMenuButtonRectLike;

  const statusBarHeight =
    typeof systemInfo.statusBarHeight === "number"
      ? systemInfo.statusBarHeight
      : DEFAULT_STATUS_BAR_HEIGHT;
  const screenHeight =
    typeof systemInfo.screenHeight === "number"
      ? systemInfo.screenHeight
      : DEFAULT_SCREEN_HEIGHT;
  const safeAreaBottom = systemInfo.safeArea?.bottom;
  const tabBarBottomInset =
    typeof safeAreaBottom === "number"
      ? Math.max(0, screenHeight - safeAreaBottom)
      : 0;
  const menuButtonRect = {
    bottom:
      typeof rawMenuRect.bottom === "number"
        ? Math.round(rawMenuRect.bottom)
        : statusBarHeight + DEFAULT_MENU_HEIGHT + 8,
    height:
      typeof rawMenuRect.height === "number"
        ? Math.round(rawMenuRect.height)
        : DEFAULT_MENU_HEIGHT,
    width:
      typeof rawMenuRect.width === "number"
        ? Math.round(rawMenuRect.width)
        : DEFAULT_MENU_WIDTH,
  };

  const navBarHeight = menuButtonRect.bottom + 10;
  const contentTopPadding = menuButtonRect.bottom + 24;
  const fabBottom = tabBarBottomInset + 96;
  const pageBottomPadding = tabBarBottomInset + 184;

  return {
    contentTopPadding,
    fabBottom,
    menuButtonRect,
    navBarHeight,
    pageBottomPadding,
    statusBarHeight,
    tabBarBottomInset,
  };
}
