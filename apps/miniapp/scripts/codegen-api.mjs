import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const outputPath = path.join(
  projectDirectory,
  "miniprogram",
  "generated",
  "api-types.d.ts"
);

function readEnv(name, fallback = "") {
  const value = process.env[name];

  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/+$/, "");
}

const apiBaseUrl = normalizeBaseUrl(
  readEnv(
    "MINIAPP_API_BASE_URL",
    readEnv(
      "MINIAPP_PRODUCTION_API_BASE_URL",
      readEnv("MINIAPP_TEST_API_BASE_URL", "http://127.0.0.1:3000/api")
    )
  )
);
const openApiUrl = readEnv("MINIAPP_OPENAPI_URL", `${apiBaseUrl}/openapi-json`);

await execFileAsync(
  "pnpm",
  ["exec", "openapi-typescript", openApiUrl, "-o", outputPath],
  { cwd: projectDirectory }
);

console.log(`Generated miniapp API types from ${openApiUrl}`);
