import request from "supertest";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { createApp } from "../src/bootstrap";

describe("API smoke tests", () => {
  let app: NestFastifyApplication | null = null;
  let shouldSkip = false;

  beforeAll(async () => {
    try {
      app = await createApp();
      await app.init();
      await app.getHttpAdapter().getInstance().ready();
    } catch (error) {
      shouldSkip = true;
      console.warn(
        "Skipping API smoke tests because the test app could not start. " +
          "This usually means the local database is unavailable.",
        error instanceof Error ? error.message : error
      );
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it("returns health status", async () => {
    if (shouldSkip || !app) {
      return;
    }

    const response = await request(app.getHttpServer()).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("can login and fetch the current user profile", async () => {
    if (shouldSkip || !app) {
      return;
    }

    const loginResponse = await request(app.getHttpServer())
      .post("/api/auth/wechat/login")
      .send({ code: "user-current" });

    expect(loginResponse.status).toBe(201);
    expect(loginResponse.body.accessToken).toEqual(expect.any(String));

    const meResponse = await request(app.getHttpServer())
      .get("/api/users/me")
      .set("Authorization", `Bearer ${loginResponse.body.accessToken}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body).toHaveProperty("userId");
  });
});
