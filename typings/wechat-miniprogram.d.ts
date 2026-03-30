declare namespace WechatMiniprogram {
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
  }

  interface Wx {
    cloud?: Cloud;
    switchTab(options: SwitchTabOption): void;
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
    route: string;
    getTabBar?(): unknown;
  }

  interface ComponentInstance<Data extends Record<string, unknown>> {
    data: Data;
    setData(data: Partial<Data>): void;
  }

  interface ComponentOption<
    Data extends Record<string, unknown>,
    Methods extends Record<string, (...args: any[]) => unknown>
  > {
    data: Data;
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

declare function Page<Data extends Record<string, unknown>>(
  options: WechatMiniprogram.PageOption<Data> &
    ThisType<WechatMiniprogram.PageInstance<Data>>
): void;

declare function Component<
  Data extends Record<string, unknown>,
  Methods extends Record<string, (...args: any[]) => unknown>
>(
  options: WechatMiniprogram.ComponentOption<Data, Methods> &
    ThisType<WechatMiniprogram.ComponentInstance<Data> & Methods>
): void;

declare function getCurrentPages(): WechatMiniprogram.CurrentPage[];
