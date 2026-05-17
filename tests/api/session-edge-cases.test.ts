import "./_setup/db";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp, readSetCookie } from "./_setup/app";
import { cleanDb, ensureTestDb } from "./_setup/db";
import {
  ADMIN_PASSWORD,
  ADMIN_USERNAME,
  authCookies,
  login,
  seedAdminUser,
  sessionCookieOnly,
} from "./_setup/auth-helpers";
import { getAppState } from "@/server/state";

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
  const { prisma } = await import("@/lib/db");
  await prisma.setting.create({
    data: { id: 1, appApiKey: "k", setupComplete: true },
  });
  await getAppState().reloadSettings();
});

describe("concurrent sessions", () => {
  it("logging in twice yields two independent sessions, both valid", async () => {
    await seedAdminUser();
    const sessionA = await login(app);
    const sessionB = await login(app);

    expect(sessionA.sessionCookie).not.toBe(sessionB.sessionCookie);

    // Both work on /me independently.
    const meA = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      ...sessionCookieOnly(sessionA),
    });
    expect(meA.statusCode).toBe(200);

    const meB = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      ...sessionCookieOnly(sessionB),
    });
    expect(meB.statusCode).toBe(200);

    // Server-side: two Session rows persisted.
    const { prisma } = await import("@/lib/db");
    expect(await prisma.session.count()).toBe(2);
  });

  it("logout of session A leaves session B usable", async () => {
    await seedAdminUser();
    const sessionA = await login(app);
    const sessionB = await login(app);

    const logout = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      ...authCookies(sessionA),
    });
    expect(logout.statusCode).toBe(200);

    // A is dead.
    const meA = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      ...sessionCookieOnly(sessionA),
    });
    expect(meA.statusCode).toBe(401);

    // B still works.
    const meB = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      ...sessionCookieOnly(sessionB),
    });
    expect(meB.statusCode).toBe(200);
  });
});

describe("stale CSRF cookie scenarios", () => {
  it("returns 403 csrf-invalid when the _csrf cookie is missing on a state-changing request", async () => {
    await seedAdminUser();
    const session = await login(app);

    const r = await app.inject({
      method: "PUT",
      url: "/api/admin/settings",
      cookies: {
        uaSession: session.sessionCookie,
        // _csrf intentionally omitted
      },
      headers: { "x-csrf-token": session.csrfToken },
      payload: { cacheDurationMinutes: 17 },
    });
    expect(r.statusCode).toBe(403);
    expect(r.json()).toEqual({ error: "csrf-invalid" });
  });

  it("returns 403 when the x-csrf-token header value does not match the _csrf secret", async () => {
    await seedAdminUser();
    const session = await login(app);

    const r = await app.inject({
      method: "PUT",
      url: "/api/admin/settings",
      cookies: {
        uaSession: session.sessionCookie,
        _csrf: session.signedCsrfCookie,
      },
      headers: { "x-csrf-token": "totally-fabricated-token-value" },
      payload: { cacheDurationMinutes: 17 },
    });
    expect(r.statusCode).toBe(403);
  });

  it("a fresh login generates a brand-new CSRF token (not reused across logins)", async () => {
    await seedAdminUser();
    const sessionA = await login(app);
    const sessionB = await login(app);

    expect(sessionA.csrfToken).not.toBe(sessionB.csrfToken);
    expect(sessionA.signedCsrfCookie).not.toBe(sessionB.signedCsrfCookie);
  });
});

describe("session cookie tampering", () => {
  it("rejects an entirely fabricated session cookie", async () => {
    const r = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      cookies: { uaSession: "never-issued-by-this-server" },
    });
    expect(r.statusCode).toBe(401);
  });

  it("rejects a session cookie after its row was revoked out from under it", async () => {
    await seedAdminUser();
    const session = await login(app);

    // Manually revoke the session row mid-flight.
    const { prisma } = await import("@/lib/db");
    await prisma.session.deleteMany({});

    const r = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      ...sessionCookieOnly(session),
    });
    expect(r.statusCode).toBe(401);
  });
});

describe("login response shape", () => {
  it("does not return the password hash or any user-row internals", async () => {
    await seedAdminUser();
    const r = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(["csrf", "ok"]);
    expect(JSON.stringify(body)).not.toContain("$argon2");
  });

  it("sets each auth cookie with HttpOnly + SameSite=Lax (security defaults)", async () => {
    await seedAdminUser();
    const r = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
    });
    const setCookies = r.headers["set-cookie"];
    const lines = Array.isArray(setCookies) ? setCookies : [setCookies];
    const sessionLine = lines.find((c) => String(c).startsWith("uaSession="));
    expect(sessionLine).toBeDefined();
    expect(String(sessionLine)).toMatch(/HttpOnly/i);
    expect(String(sessionLine)).toMatch(/SameSite=Lax/i);

    // The CSRF token cookie is JS-readable on purpose so the SPA can copy
    // it into the x-csrf-token header. HttpOnly must NOT be set on it.
    const csrfLine = lines.find((c) => String(c).startsWith("ua-csrf="));
    expect(String(csrfLine)).not.toMatch(/HttpOnly/i);
    expect(readSetCookie(setCookies, "ua-csrf")).not.toBeNull();
  });
});
