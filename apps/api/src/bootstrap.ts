import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { RequestMethod, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
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

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true
    })
  );

  app.setGlobalPrefix("api", {
    exclude: [{ path: "health", method: RequestMethod.GET }]
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
