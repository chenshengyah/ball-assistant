import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { RequestMethod, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { AppModule } from "./app.module";

export async function createApp(): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

  await app.register(helmet);
  await app.register(cors, {
    origin: true,
    credentials: true
  });
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 1
    }
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true
    })
  );

  app.setGlobalPrefix("api", {
    exclude: [{ path: "health", method: RequestMethod.GET }]
  });

  const configService = app.get(ConfigService);
  const uploadsRoot = resolve(configService.get<string>("UPLOADS_DIR", "./uploads"));

  mkdirSync(uploadsRoot, { recursive: true });

  await app.register(fastifyStatic, {
    root: uploadsRoot,
    prefix: "/api/uploads/"
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle("ball-assistant API")
    .setDescription("Monorepo backend for the ball assistant miniapp.")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup("api/docs", app, document);

  app
    .getHttpAdapter()
    .getInstance()
    .get("/api/openapi-json", async (_request, reply) => {
      await reply.send(document);
    });

  app.enableShutdownHooks();

  return app;
}
