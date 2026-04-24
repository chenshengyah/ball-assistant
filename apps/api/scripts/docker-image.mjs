import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const apiDirectory = path.resolve(scriptDirectory, "..");
const repositoryRoot = path.resolve(apiDirectory, "..", "..");
const artifactsDirectory = path.join(apiDirectory, "artifacts");
const metadataOutputPath = path.join(artifactsDirectory, "api-image.json");

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

async function runCommand(command, args, cwd) {
  await execFileAsync(command, args, {
    cwd,
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
  });
}

const now = new Date();
const dryRun = toBooleanFlag(readEnv("API_DRY_RUN", "0"));
const pushImage = toBooleanFlag(readEnv("API_PUSH_IMAGE", "0"));
const imageName = readEnv("API_IMAGE_NAME", "ball-assistant-api");
const imageTag = readEnv("API_IMAGE_TAG", `dev-${formatTimestamp(now)}`);
const imagePlatform = readEnv("API_IMAGE_PLATFORM", "");
const extraTags = readEnv("API_IMAGE_EXTRA_TAGS", "")
  .split(",")
  .map((tag) => tag.trim())
  .filter(Boolean);

const imageReferences = [imageTag, ...extraTags].map((tag) => `${imageName}:${tag}`);
const buildCommand = ["build", "-f", "apps/api/Dockerfile"];

if (imagePlatform) {
  buildCommand.push("--platform", imagePlatform);
}

for (const imageReference of imageReferences) {
  buildCommand.push("-t", imageReference);
}

buildCommand.push(".");

const metadata = {
  imageName,
  imageTag,
  imagePlatform,
  imageReferences,
  pushImage,
  dryRun,
  generatedAt: now.toISOString(),
};

await fs.mkdir(artifactsDirectory, { recursive: true });

if (dryRun) {
  await fs.writeFile(metadataOutputPath, `${JSON.stringify(metadata, null, 2)}\n`);
  console.log(`Dry run complete. API image metadata written to ${metadataOutputPath}`);
  process.exit(0);
}

await runCommand("docker", buildCommand, repositoryRoot);

if (pushImage) {
  for (const imageReference of imageReferences) {
    await runCommand("docker", ["push", imageReference], repositoryRoot);
  }
}

await fs.writeFile(metadataOutputPath, `${JSON.stringify(metadata, null, 2)}\n`);

console.log(`API image ready: ${imageReferences.join(", ")}`);
if (pushImage) {
  console.log("Docker push completed.");
}
console.log(`Image metadata written to ${metadataOutputPath}`);
