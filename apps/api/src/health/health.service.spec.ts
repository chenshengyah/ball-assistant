import { HealthService } from "./health.service";

describe("HealthService", () => {
  it("returns an ok status payload", () => {
    const service = new HealthService();
    const result = service.getHealth();

    expect(result.status).toBe("ok");
    expect(result.timestamp).toEqual(expect.any(String));
  });
});
