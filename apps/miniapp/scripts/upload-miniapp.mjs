import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ci = require("miniprogram-ci");

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const artifactsDirectory = path.join(projectDirectory, "artifacts");
const metadataOutputPath = path.join(artifactsDirectory, "miniapp-upload.json");

function readEnv(name, fallback = "") {
  const value = process.env[name];

  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toBooleanFlag(value) {
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function formatTimestamp(date) {
  const parts = [
    date.getFullYear(),
    `${date.getMonth() + 1}`.padStart(2, "0"),
    `${date.getDate()}`.padStart(2, "0"),
    `${date.getHours()}`.padStart(2, "0"),
    `${date.getMinutes()}`.padStart(2, "0"),
  ];

  return parts.join("");
}

async function readAppId() {
  const projectConfigPath = path.join(projectDirectory, "project.config.json");
  const projectConfig = JSON.parse(await fs.readFile(projectConfigPath, "utf8"));

  return readEnv("MINIAPP_APPID", projectConfig.appid);
}

async function ensureFileExists(filePath, description) {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`${description} not found: ${filePath}`);
  }
}

const uploadTarget = readEnv("MINIAPP_UPLOAD_TARGET", "dev");
const dryRun = toBooleanFlag(readEnv("MINIAPP_DRY_RUN", "0"));
const now = new Date();
const defaultVersionPrefix = uploadTarget === "experience" ? "exp" : "dev";
const defaultVersion = `${defaultVersionPrefix}-${formatTimestamp(now)}`;
const defaultRobot = uploadTarget === "experience" ? "30" : "1";
const defaultDescription =
  uploadTarget === "experience"
    ? `Experience upload ${now.toISOString()}`
    : `Local dev upload ${now.toISOString()}`;

const appId = await readAppId();
const privateKeyPath = readEnv(
  "MINIAPP_CI_PRIVATE_KEY_PATH",
  path.join(projectDirectory, ".private", "miniapp-ci.key")
);
const uploadVersion = readEnv("MINIAPP_UPLOAD_VERSION", defaultVersion);
const uploadDescription = readEnv("MINIAPP_UPLOAD_DESC", defaultDescription);
const uploadRobot = Number.parseInt(readEnv("MINIAPP_ROBOT", defaultRobot), 10);

await fs.mkdir(artifactsDirectory, { recursive: true });

const metadata = {
  appId,
  uploadTarget,
  uploadVersion,
  uploadDescription,
  uploadRobot: Number.isNaN(uploadRobot) ? Number.parseInt(defaultRobot, 10) : uploadRobot,
  privateKeyPath,
  dryRun,
  generatedAt: now.toISOString(),
};

if (dryRun) {
  await fs.writeFile(metadataOutputPath, `${JSON.stringify(metadata, null, 2)}\n`);
  console.log(`Dry run complete. Upload metadata written to ${metadataOutputPath}`);
  process.exit(0);
}

await ensureFileExists(privateKeyPath, "Miniapp CI private key");

const project = new ci.Project({
  appid: appId,
  type: "miniProgram",
  projectPath: projectDirectory,
  privateKeyPath,
  ignores: ["node_modules/**/*"],
});

await ci.upload({
  project,
  version: uploadVersion,
  desc: uploadDescription,
  robot: Number.isNaN(uploadRobot) ? Number.parseInt(defaultRobot, 10) : uploadRobot,
  setting: {
    es6: true,
    enhance: true,
    minifyJS: true,
    minifyWXML: true,
    minifyWXSS: true,
    minified: true,
    postcss: true,
    uploadWithSourceMap: true,
  },
});

await fs.writeFile(metadataOutputPath, `${JSON.stringify(metadata, null, 2)}\n`);

console.log(
  `Miniapp upload completed for ${uploadTarget} via robot ${metadata.uploadRobot}.`
);
console.log(`Upload metadata written to ${metadataOutputPath}`);
