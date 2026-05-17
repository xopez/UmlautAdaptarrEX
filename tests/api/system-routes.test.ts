import "./_setup/db";

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "./_setup/app";
import { cleanDb, ensureTestDb } from "./_setup/db";
import {
  authCookies,
  login,
  seedAdminUser,
  sessionCookieOnly,
} from "./_setup/auth-helpers";

let app: FastifyInstance;

beforeAll(async () => {
  await ensureTestDb();
  app = await buildTestApp();
});

afterAll(async () => {
  await app.close();
  const { prisma } = await import("@/lib/db");
  await prisma.$disconnect();
});

beforeEach(async () => {
  await cleanDb();
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/admin/system/capabilities", () => {
  it("returns canRestart=true when the supervisor env var is set", async () => {
    vi.stubEnv("UMLAUTADAPTARREX_SUPERVISED", "1");
    await seedAdminUser();
    const session = await login(app);

    const r = await app.inject({
      method: "GET",
      url: "/api/admin/system/capabilities",
      ...sessionCookieOnly(session),
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ canRestart: true });
  });

  it("returns canRestart=false outside the supervisor", async () => {
    vi.stubEnv("UMLAUTADAPTARREX_SUPERVISED", "");
    await seedAdminUser();
    const session = await login(app);

    const r = await app.inject({
      method: "GET",
      url: "/api/admin/system/capabilities",
      ...sessionCookieOnly(session),
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ canRestart: false });
  });

  it("rejects unauthenticated callers with 401", async () => {
    const r = await app.inject({
      method: "GET",
      url: "/api/admin/system/capabilities",
    });
    expect(r.statusCode).toBe(401);
  });
});

describe("POST /api/admin/system/restart", () => {
  it("returns 202 with the supervised flag and exit code", async () => {
    vi.stubEnv("UMLAUTADAPTARREX_SUPERVISED", "1");
    // Stub out the side-effect timer that would otherwise emit the restart
    // event after the response. We just want to verify the wire response.
    const realSetTimeout = global.setTimeout;
    global.setTimeout = ((_fn: () => void, _ms: number) => 0) as never;

    try {
      await seedAdminUser();
      const session = await login(app);
      const r = await app.inject({
        method: "POST",
        url: "/api/admin/system/restart",
        ...authCookies(session),
      });
      expect(r.statusCode).toBe(202);
      expect(r.json()).toEqual({
        ok: true,
        supervised: true,
        exitCode: 75,
      });
    } finally {
      global.setTimeout = realSetTimeout;
    }
  });

  it("reflects supervised=false when the env var is missing", async () => {
    vi.stubEnv("UMLAUTADAPTARREX_SUPERVISED", "");
    const realSetTimeout = global.setTimeout;
    global.setTimeout = ((_fn: () => void, _ms: number) => 0) as never;

    try {
      await seedAdminUser();
      const session = await login(app);
      const r = await app.inject({
        method: "POST",
        url: "/api/admin/system/restart",
        ...authCookies(session),
      });
      expect(r.statusCode).toBe(202);
      expect(r.json()).toMatchObject({ ok: true, supervised: false });
    } finally {
      global.setTimeout = realSetTimeout;
    }
  });

  it("rejects unauthenticated callers with 401 (never reaches the timer)", async () => {
    const r = await app.inject({
      method: "POST",
      url: "/api/admin/system/restart",
    });
    expect(r.statusCode).toBe(401);
  });

  it("rejects callers without a CSRF token with 403", async () => {
    await seedAdminUser();
    const session = await login(app);
    const r = await app.inject({
      method: "POST",
      url: "/api/admin/system/restart",
      cookies: {
        uaSession: session.sessionCookie,
        _csrf: session.signedCsrfCookie,
      },
    });
    expect(r.statusCode).toBe(403);
  });
});
