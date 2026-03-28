declare namespace WechatMiniprogram {
  interface CloudConfig {
    env?: string;
    traceUser?: boolean;
  }

  interface Cloud {
    init(config: CloudConfig): void;
  }

  interface Wx {
    cloud?: Cloud;
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
}

declare const wx: WechatMiniprogram.Wx;

declare function App<T extends WechatMiniprogram.AppOption>(
  options: T & ThisType<T>
): void;

declare function Page<Data extends Record<string, unknown>>(
  options: WechatMiniprogram.PageOption<Data> &
    ThisType<WechatMiniprogram.PageOption<Data>>
): void;
