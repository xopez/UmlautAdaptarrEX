import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/middleware", () => ({
  requireAuth: async () => {
    /* no-op preHandler for unit tests */
  },
}));

import { systemRoutes } from "@/server/routes/admin/system";

let app: ReturnType<typeof Fastify>;

beforeEach(async () => {
  app = Fastify({ logger: false });
  await systemRoutes(app);
  await app.ready();
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await app.close();
});

describe("systemRoutes", () => {
  it("GET /system/capabilities reflects the supervisor env var", async () => {
    vi.stubEnv("UMLAUTADAPTARREX_SUPERVISED", "1");
    const r = await app.inject({
      method: "GET",
      url: "/api/admin/system/capabilities",
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ canRestart: true });
  });

  it("GET /system/capabilities returns canRestart=false outside the supervisor", async () => {
    vi.stubEnv("UMLAUTADAPTARREX_SUPERVISED", "");
    const r = await app.inject({
      method: "GET",
      url: "/api/admin/system/capabilities",
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ canRestart: false });
  });

  it("POST /system/restart returns 202 with the supervisor flag and exit code", async () => {
    vi.stubEnv("UMLAUTADAPTARREX_SUPERVISED", "1");
    // Replace the setTimeout side effect: capture it so the test does not
    // actually emit the restart event.
    const realSetTimeout = global.setTimeout;
    global.setTimeout = ((_fn: () => void, _ms: number) => 0) as never;

    try {
      const r = await app.inject({
        method: "POST",
        url: "/api/admin/system/restart",
      });
      expect(r.statusCode).toBe(202);
      const body = r.json() as {
        ok: boolean;
        supervised: boolean;
        exitCode: number;
      };
      expect(body).toEqual({ ok: true, supervised: true, exitCode: 75 });
    } finally {
      global.setTimeout = realSetTimeout;
    }
  });
});
