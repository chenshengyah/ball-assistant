export type MiniappEnvironmentName = "local" | "production";
type MiniappEnvironmentAlias = MiniappEnvironmentName | "test";

type MiniappEnvironmentConfig = {
  label: string;
  apiBaseUrl: string;
};

type MiniappPrivateEnvironment = Partial<{
  currentEnv: MiniappEnvironmentAlias;
  apiBaseUrl: string;
  environments: Partial<
    Record<MiniappEnvironmentAlias, Partial<MiniappEnvironmentConfig>>
  >;
}>;

declare const require:
  | undefined
  | ((path: string) => { miniappPrivateEnv?: MiniappPrivateEnvironment });

const defaultEnvironments: Record<
  MiniappEnvironmentName,
  MiniappEnvironmentConfig
> = {
  local: {
    label: "Local API",
    apiBaseUrl: "http://127.0.0.1:3000/api",
  },
  production: {
    label: "Production API",
    apiBaseUrl: "https://ball-assistant.cloud/api",
  },
};

function normalizeEnvironmentName(
  envName: MiniappEnvironmentAlias | undefined
): MiniappEnvironmentName {
  if (envName === "local") {
    return "local";
  }

  return "production";
}

function loadPrivateEnvironment(): MiniappPrivateEnvironment {
  if (typeof require !== "function") {
    return {};
  }

  try {
    const module = require("./private");

    return module.miniappPrivateEnv ?? {};
  } catch {
    return {};
  }
}

const privateEnvironment = loadPrivateEnvironment();

const environments: Record<MiniappEnvironmentName, MiniappEnvironmentConfig> = {
  local: {
    ...defaultEnvironments.local,
    ...privateEnvironment.environments?.local,
  },
  production: {
    ...defaultEnvironments.production,
    ...privateEnvironment.environments?.production,
    ...privateEnvironment.environments?.test,
  },
};

const currentEnv: MiniappEnvironmentName =
  normalizeEnvironmentName(privateEnvironment.currentEnv);
const currentEnvironment = environments[currentEnv];
const apiBaseUrl =
  privateEnvironment.apiBaseUrl?.trim() || currentEnvironment.apiBaseUrl;

export const miniappRuntimeEnvironment = {
  currentEnv,
  currentEnvironment,
  environments,
  apiBaseUrl,
} as const;
