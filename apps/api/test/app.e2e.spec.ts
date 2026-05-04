import request from "supertest";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { createApp } from "../src/bootstrap";

describe("API smoke tests", () => {
  let app: NestFastifyApplication | null = null;
  let shouldSkip = false;
  const runId = `${Date.now()}-${Math.round(Math.random() * 100000)}`;

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

  async function loginAs(code: string): Promise<string> {
    if (!app) {
      throw new Error("test app is not initialized");
    }

    const response = await request(app.getHttpServer())
      .post("/api/auth/wechat/login")
      .send({ code });

    expect(response.status).toBe(201);
    expect(response.body.accessToken).toEqual(expect.any(String));

    return response.body.accessToken as string;
  }

  async function completeProfile(token: string, nickname: string): Promise<void> {
    if (!app) {
      throw new Error("test app is not initialized");
    }

    const profileResponse = await request(app.getHttpServer())
      .put("/api/users/me/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nickname,
        gender: "MALE",
        avatarUrl: ""
      });

    expect(profileResponse.status).toBe(200);

    const phoneResponse = await request(app.getHttpServer())
      .post("/api/users/me/phone-number")
      .set("Authorization", `Bearer ${token}`)
      .send({
        phoneNumber: `138${String(Math.round(Math.random() * 99999999)).padStart(8, "0")}`
      });

    expect(phoneResponse.status).toBe(201);
  }

  function createActivityPayload(overrides: Record<string, unknown> = {}) {
    return {
      ownerType: "PERSONAL",
      ownerId: "",
      title: `测试活动 ${runId}`,
      chargeMode: "AA",
      chargeAmountCents: 5000,
      chargeDesc: "测试收费",
      venueName: "测试球馆",
      venueAddress: "测试地址",
      signupMode: "GENERAL",
      activityDate: "2026-06-15",
      startTime: "19:00",
      endTime: "21:00",
      cancelCutoffMinutesBeforeStart: 60,
      descriptionRichtext: "测试详情",
      totalCapacity: 1,
      courts: [],
      ...overrides
    };
  }

  it("creates personal and club activities with real API data", async () => {
    if (shouldSkip || !app) {
      return;
    }

    const ownerToken = await loginAs(`owner-${runId}`);
    await completeProfile(ownerToken, `Owner ${runId}`);
    const meResponse = await request(app.getHttpServer())
      .get("/api/users/me")
      .set("Authorization", `Bearer ${ownerToken}`);
    const ownerId = meResponse.body.userId as string;

    const personalResponse = await request(app.getHttpServer())
      .post("/api/activities")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(createActivityPayload({ ownerId }));

    expect(personalResponse.status).toBe(201);
    expect(personalResponse.body.ownerType).toBe("PERSONAL");
    expect(personalResponse.body.venueSnapshotName).toBe("测试球馆");

    const clubResponse = await request(app.getHttpServer())
      .post("/api/clubs")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        category: "BADMINTON",
        name: `测试俱乐部 ${runId}`,
        contactName: "测试负责人",
        contactPhone: "13912345678"
      });

    expect(clubResponse.status).toBe(201);

    const clubActivityResponse = await request(app.getHttpServer())
      .post("/api/activities")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(
        createActivityPayload({
          ownerType: "CLUB",
          ownerId: clubResponse.body.clubId,
          title: `测试俱乐部活动 ${runId}`
        })
      );

    expect(clubActivityResponse.status).toBe(201);
    expect(clubActivityResponse.body.ownerType).toBe("CLUB");
  });

  it("handles general signup, waitlist promotion, and my activities", async () => {
    if (shouldSkip || !app) {
      return;
    }

    const ownerToken = await loginAs(`general-owner-${runId}`);
    const firstToken = await loginAs(`general-first-${runId}`);
    const secondToken = await loginAs(`general-second-${runId}`);
    await completeProfile(ownerToken, `General Owner ${runId}`);
    await completeProfile(firstToken, `General First ${runId}`);
    await completeProfile(secondToken, `General Second ${runId}`);

    const ownerResponse = await request(app.getHttpServer())
      .get("/api/users/me")
      .set("Authorization", `Bearer ${ownerToken}`);
    const activityResponse = await request(app.getHttpServer())
      .post("/api/activities")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(createActivityPayload({ ownerId: ownerResponse.body.userId }));

    expect(activityResponse.status).toBe(201);
    const activityId = activityResponse.body.activityId as string;

    const firstSignup = await request(app.getHttpServer())
      .post(`/api/activities/${activityId}/signups`)
      .set("Authorization", `Bearer ${firstToken}`)
      .send({});

    expect(firstSignup.status).toBe(201);
    expect(firstSignup.body.currentUserSignupLabel).toContain("已确认");

    const secondSignup = await request(app.getHttpServer())
      .post(`/api/activities/${activityId}/signups`)
      .set("Authorization", `Bearer ${secondToken}`)
      .send({});

    expect(secondSignup.status).toBe(201);
    expect(secondSignup.body.currentUserSignupLabel).toContain("候补");

    const cancelResponse = await request(app.getHttpServer())
      .post(`/api/activities/signups/${firstSignup.body.currentUserRegistrationId}/cancel`)
      .set("Authorization", `Bearer ${firstToken}`);

    expect(cancelResponse.status).toBe(201);

    const promotedDetail = await request(app.getHttpServer())
      .get(`/api/activities/${activityId}`)
      .set("Authorization", `Bearer ${secondToken}`);

    expect(promotedDetail.status).toBe(200);
    expect(promotedDetail.body.currentUserSignupLabel).toContain("已确认");

    const myActivities = await request(app.getHttpServer())
      .get("/api/activities/my")
      .set("Authorization", `Bearer ${secondToken}`);

    expect(myActivities.status).toBe(200);
    expect(myActivities.body.joined.some((item: { activityId: string }) => item.activityId === activityId)).toBe(true);
  });

  it("handles court signup, capacity changes, and moving registrations", async () => {
    if (shouldSkip || !app) {
      return;
    }

    const ownerToken = await loginAs(`court-owner-${runId}`);
    const firstToken = await loginAs(`court-first-${runId}`);
    const secondToken = await loginAs(`court-second-${runId}`);
    await completeProfile(ownerToken, `Court Owner ${runId}`);
    await completeProfile(firstToken, `Court First ${runId}`);
    await completeProfile(secondToken, `Court Second ${runId}`);

    const ownerResponse = await request(app.getHttpServer())
      .get("/api/users/me")
      .set("Authorization", `Bearer ${ownerToken}`);
    const activityResponse = await request(app.getHttpServer())
      .post("/api/activities")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(
        createActivityPayload({
          ownerId: ownerResponse.body.userId,
          title: `测试选场活动 ${runId}`,
          signupMode: "USER_SELECT_COURT",
          totalCapacity: undefined,
          courts: [
            { courtName: "1 号场", capacity: 1, sortOrder: 1 },
            { courtName: "2 号场", capacity: 1, sortOrder: 2 }
          ]
        })
      );

    expect(activityResponse.status).toBe(201);
    const activityId = activityResponse.body.activityId as string;
    const firstCourtId = activityResponse.body.courts[0].id as string;
    const secondCourtId = activityResponse.body.courts[1].id as string;

    const firstSignup = await request(app.getHttpServer())
      .post(`/api/activities/${activityId}/signups`)
      .set("Authorization", `Bearer ${firstToken}`)
      .send({ activityCourtId: firstCourtId });

    expect(firstSignup.status).toBe(201);

    const secondSignup = await request(app.getHttpServer())
      .post(`/api/activities/${activityId}/signups`)
      .set("Authorization", `Bearer ${secondToken}`)
      .send({ activityCourtId: firstCourtId });

    expect(secondSignup.status).toBe(201);
    expect(secondSignup.body.currentUserSignupLabel).toContain("候补");

    const capacityResponse = await request(app.getHttpServer())
      .put(`/api/activities/courts/${firstCourtId}/capacity`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ capacity: 2 });

    expect(capacityResponse.status).toBe(200);
    expect(capacityResponse.body.courts[0].confirmedCount).toBe(2);

    const moveResponse = await request(app.getHttpServer())
      .put(`/api/activities/signups/${secondSignup.body.currentUserRegistrationId}/court`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ activityCourtId: secondCourtId });

    expect(moveResponse.status).toBe(200);
    expect(
      moveResponse.body.courts
        .find((court: { id: string }) => court.id === secondCourtId)
        .registrations.some(
          (registration: { registrationId: string }) =>
            registration.registrationId === secondSignup.body.currentUserRegistrationId
        )
    ).toBe(true);
  });
});
