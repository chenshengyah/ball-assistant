import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { extname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

const ALLOWED_SCENES = new Set([
  "activity-cover",
  "activity-detail",
  "club-cover",
  "club-logo",
  "user-avatar"
]);
const ALLOWED_MIME_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"]
]);

@Injectable()
export class AssetsService {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

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
    const sceneDirectory = resolve(uploadsRoot, scene);
    const fileName = `${Date.now()}-${randomUUID()}${extension}`;
    const filePath = resolve(sceneDirectory, fileName);

    await mkdir(sceneDirectory, { recursive: true });
    await pipeline(upload.file, createWriteStream(filePath));
    await stat(filePath);

    return {
      assetKey: `${scene}/${fileName}`,
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
}
