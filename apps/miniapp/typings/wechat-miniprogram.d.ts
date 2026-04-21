declare namespace WechatMiniprogram {
  interface NavigateToOption {
    url: string;
  }

  interface RedirectToOption {
    url: string;
  }

  interface NavigateBackOption {
    delta?: number;
  }

  interface ShowToastOption {
    title: string;
    icon?: string;
  }

  interface ShowActionSheetSuccessCallbackResult {
    tapIndex: number;
  }

  interface ShowActionSheetOption {
    itemList: string[];
    success?(result: ShowActionSheetSuccessCallbackResult): void;
  }

  interface LoginSuccessCallbackResult {
    code: string;
  }

  interface LoginOption {
    timeout?: number;
    success?(result: LoginSuccessCallbackResult): void;
    fail?(error: unknown): void;
  }

  interface RequestSuccessCallbackResult<T = unknown> {
    data: T;
    statusCode: number;
  }

  interface RequestOption<T = unknown> {
    url: string;
    method?: "GET" | "POST" | "PUT" | "DELETE";
    data?: unknown;
    header?: Record<string, string>;
    timeout?: number;
    success?(result: RequestSuccessCallbackResult<T>): void;
    fail?(error: unknown): void;
  }

  interface SystemInfo {
    safeArea?: {
      bottom?: number;
    };
    screenHeight?: number;
    statusBarHeight?: number;
  }

  interface MenuButtonRect {
    bottom?: number;
    height?: number;
    width?: number;
  }

  interface CurrentPage {
    route: string;
  }

  interface CloudConfig {
    env?: string;
    traceUser?: boolean;
  }

  interface Cloud {
    init(config: CloudConfig): void;
  }

  interface SwitchTabOption {
    url: string;
  }

  interface BaseEvent<Dataset extends Record<string, unknown> = Record<string, unknown>> {
    currentTarget: {
      dataset: Dataset;
    };
    detail: Dataset;
  }

  interface Wx {
    cloud?: Cloud;
    switchTab(options: SwitchTabOption): void;
    navigateTo(options: NavigateToOption): void;
    redirectTo(options: RedirectToOption): void;
    navigateBack(options?: NavigateBackOption): void;
    showToast(options: ShowToastOption): void;
    showActionSheet(options: ShowActionSheetOption): void;
    getSystemInfoSync(): SystemInfo;
    getMenuButtonBoundingClientRect(): MenuButtonRect;
    login(options: LoginOption): void;
    request<T = unknown>(options: RequestOption<T>): void;
  }

  interface AppOption {
    onLaunch?(): void;
    [key: string]: unknown;
  }

  interface PageOption<Data extends Record<string, unknown>> {
    data: Data;
    onLoad?(options: Record<string, string | undefined>): void;
    onReady?(): void;
    onShow?(): void;
    onHide?(): void;
    onUnload?(): void;
    onPullDownRefresh?(): void;
    onReachBottom?(): void;
    onShareAppMessage?(): void | Record<string, unknown>;
    [key: string]: unknown;
  }

  interface PageInstance<Data extends Record<string, unknown>>
    extends PageOption<Data> {
    data: Data;
    route: string;
    setData(data: Partial<Data> | Record<string, unknown>): void;
    getTabBar?(): unknown;
  }

  interface ComponentInstance<Data extends Record<string, unknown>> {
    data: Data;
    properties: Record<string, unknown>;
    setData(data: Partial<Data>): void;
  }

  interface ComponentOption<
    Data extends Record<string, unknown>,
    Methods extends Record<string, (...args: any[]) => unknown>
  > {
    data: Data;
    properties?: Record<string, unknown>;
    lifetimes?: {
      attached?(): void;
      detached?(): void;
    };
    pageLifetimes?: {
      show?(): void;
      hide?(): void;
      resize?(): void;
    };
    methods: Methods;
  }
}

declare const wx: WechatMiniprogram.Wx;

declare function App<T extends WechatMiniprogram.AppOption>(
  options: T & ThisType<T>
): void;

declare function Page<
  Data extends Record<string, unknown>,
  T extends WechatMiniprogram.PageOption<Data> = WechatMiniprogram.PageOption<Data>
>(options: T & ThisType<WechatMiniprogram.PageInstance<Data> & T>): void;

declare function Component<
  Data extends Record<string, unknown>,
  Methods extends Record<string, (...args: any[]) => unknown>
>(
  options: WechatMiniprogram.ComponentOption<Data, Methods> &
    ThisType<WechatMiniprogram.ComponentInstance<Data> & Methods>
): void;

declare function getCurrentPages(): WechatMiniprogram.CurrentPage[];
