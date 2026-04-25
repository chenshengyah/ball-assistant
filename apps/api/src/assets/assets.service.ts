import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import COS from "cos-nodejs-sdk-v5";
import { createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import type { Stream } from "node:stream";
import { pipeline } from "node:stream/promises";
import { extname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

const ALLOWED_SCENES = new Set([
  "activity-cover",
  "activity-detail",
  "club-cover",
  "club-logo"
]);
const ALLOWED_MIME_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"]
]);

@Injectable()
export class AssetsService {
  private readonly cosClient: COS | undefined;

  constructor(private readonly configService: ConfigService) {
    const cosConfig = this.readCosConfig();

    if (cosConfig) {
      this.cosClient = new COS({
        SecretId: cosConfig.secretId,
        SecretKey: cosConfig.secretKey
      });
    }
  }

  async uploadImage(request: {
    file: () => Promise<{
      fields?: Record<string, { value?: unknown }>;
      filename?: string;
      mimetype?: string;
      file: NodeJS.ReadableStream;
    } | undefined>;
  }): Promise<{
    assetKey: string;
    assetUrl: string;
    mimeType: string;
  }> {
    const upload = await request.file();

    if (!upload) {
      throw new BadRequestException("请上传图片文件");
    }

    const scene = this.readScene(upload.fields);
    const mimeType = upload.mimetype ?? "";
    const extension = ALLOWED_MIME_TYPES.get(mimeType) ?? extname(upload.filename ?? "").toLowerCase();

    if (!ALLOWED_MIME_TYPES.has(mimeType) || !extension) {
      throw new BadRequestException("仅支持 jpg、png、webp 图片");
    }

    const uploadsRoot = resolve(this.configService.get<string>("UPLOADS_DIR", "./uploads"));
    const fileName = `${Date.now()}-${randomUUID()}${extension}`;
    const assetKey = `${scene}/${fileName}`;
    const cosConfig = this.readCosConfig();

    if (this.cosClient && cosConfig) {
      const cosKey = [cosConfig.uploadPrefix, assetKey].filter(Boolean).join("/");

      await this.cosClient.putObject({
        Bucket: cosConfig.bucket,
        Region: cosConfig.region,
        Key: cosKey,
        Body: upload.file as unknown as Stream,
        ContentType: mimeType,
        ACL: "public-read"
      });

      return {
        assetKey: cosKey,
        assetUrl: `${cosConfig.publicBaseUrl}/${cosKey}`,
        mimeType
      };
    }

    const sceneDirectory = resolve(uploadsRoot, scene);
    const filePath = resolve(sceneDirectory, fileName);

    await mkdir(sceneDirectory, { recursive: true });
    await pipeline(upload.file, createWriteStream(filePath));
    await stat(filePath);

    return {
      assetKey,
      assetUrl: `/api/uploads/${scene}/${fileName}`,
      mimeType
    };
  }

  private readScene(fields?: Record<string, { value?: unknown }>): string {
    const value = fields?.scene?.value;
    const scene = typeof value === "string" ? value.trim() : "";

    if (!ALLOWED_SCENES.has(scene)) {
      throw new BadRequestException("图片场景不合法");
    }

    return scene;
  }

  private readCosConfig():
    | {
        secretId: string;
        secretKey: string;
        bucket: string;
        region: string;
        publicBaseUrl: string;
        uploadPrefix: string;
      }
    | undefined {
    const secretId = this.readOptionalEnv("COS_SECRET_ID");
    const secretKey = this.readOptionalEnv("COS_SECRET_KEY");
    const bucket = this.readOptionalEnv("COS_BUCKET");
    const region = this.readOptionalEnv("COS_REGION");
    const publicBaseUrl = this.readOptionalEnv("COS_PUBLIC_BASE_URL")?.replace(/\/+$/, "");
    const uploadPrefix = this.readOptionalEnv("COS_UPLOAD_PREFIX")?.replace(/^\/+|\/+$/g, "") ?? "";

    if (!secretId || !secretKey || !bucket || !region || !publicBaseUrl) {
      return undefined;
    }

    return {
      secretId,
      secretKey,
      bucket,
      region,
      publicBaseUrl,
      uploadPrefix
    };
  }

  private readOptionalEnv(name: string): string | undefined {
    const value = this.configService.get<string>(name);
    const trimmed = typeof value === "string" ? value.trim() : "";

    return trimmed || undefined;
  }
}
