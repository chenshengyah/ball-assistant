import type { MiniappEnvironmentName } from "./env";

export const miniappPrivateEnv: {
  currentEnv: MiniappEnvironmentName;
  apiBaseUrl?: string;
  environments?: Partial<
    Record<
      MiniappEnvironmentName,
      {
        label?: string;
        apiBaseUrl?: string;
      }
    >
  >;
} = {
  currentEnv: "production",
  environments: {
    local: {
      apiBaseUrl: "http://192.168.1.10:3000/api",
    },
    production: {
      apiBaseUrl: "https://ball-assistant.cloud/api",
    },
  },
};
