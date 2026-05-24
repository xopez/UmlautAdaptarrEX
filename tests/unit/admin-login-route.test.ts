import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import csrfProtection from "@fastify/csrf-protection";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/middleware", () => ({
  requireAuth: async () => {
    /* no-op for unit tests */
  },
}));

const { mockAdminUser } = vi.hoisted(() => ({
  mockAdminUser: { findUnique: vi.fn() },
}));

vi.mock("@/lib/db", () => ({
  prisma: { adminUser: mockAdminUser },
}));

const { mockVerify, mockDummyVerify } = vi.hoisted(() => ({
  mockVerify: vi.fn(),
  mockDummyVerify: vi.fn(),
}));

vi.mock("@/lib/auth/password", () => ({
  verifyPassword: mockVerify,
  dummyVerifyPassword: mockDummyVerify,
}));

const { mockSession } = vi.hoisted(() => ({
  mockSession: {
    create: vi.fn(),
    rotate: vi.fn(),
    get: vi.fn(),
    revoke: vi.fn(),
  },
}));

vi.mock("@/lib/auth/session", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/auth/session")>();
  return {
    ...orig,
    createSession: mockSession.create,
    rotateSessionForUser: mockSession.rotate,
    getSession: mockSession.get,
    revokeSession: mockSession.revoke,
  };
});

import { loginRoutes } from "@/server/routes/admin/login";

let app: FastifyInstance;

beforeEach(async () => {
  mockAdminUser.findUnique.mockReset();
  mockVerify.mockReset();
  mockDummyVerify.mockReset();
  mockSession.create.mockReset();
  mockSession.rotate.mockReset();
  mockSession.get.mockReset();
  mockSession.revoke.mockReset();

  app = Fastify({ logger: false });
  await app.register(cookie, { secret: "test-cookie-secret" });
  await app.register(csrfProtection, {
    sessionPlugin: "@fastify/cookie",
    cookieOpts: { path: "/", sameSite: "lax", httpOnly: true, signed: true },
  });
  await loginRoutes(app);
  await app.ready();
});

afterEach(async () => {
  await app.close();
});

describe("POST /api/auth/login", () => {
  it("rejects an invalid body with 400", async () => {
    const r = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "" },
    });
    expect(r.statusCode).toBe(400);
  });

  it("returns 401 invalid-credentials when the user is unknown", async () => {
    mockAdminUser.findUnique.mockResolvedValueOnce(null);
    mockDummyVerify.mockResolvedValueOnce(undefined);
    const r = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "ghost", password: "irrelevant" },
    });
    expect(r.statusCode).toBe(401);
    expect(r.json()).toEqual({ error: "invalid-credentials" });
    // BUG-012: dummy verify must run even when the user does not exist,
    // otherwise the timing channel leaks which usernames are registered.
    expect(mockDummyVerify).toHaveBeenCalledWith("irrelevant");
  });

  it("returns 401 invalid-credentials when the password verify fails", async () => {
    mockAdminUser.findUnique.mockResolvedValueOnce({
      id: "u1",
      username: "admin",
      passwordHash: "$argon2id$abc",
    });
    mockVerify.mockResolvedValueOnce(false);
    const r = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "admin", password: "wrong" },
    });
    expect(r.statusCode).toBe(401);
  });

  it("creates a session, sets cookies, and returns ok+csrf on success", async () => {
    mockAdminUser.findUnique.mockResolvedValueOnce({
      id: "u1",
      username: "admin",
      passwordHash: "$argon2id$abc",
    });
    mockVerify.mockResolvedValueOnce(true);
    mockSession.rotate.mockResolvedValueOnce({
      id: "session-id-12345",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const r = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "admin", password: "right" },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { ok: boolean; csrf: string };
    expect(body.ok).toBe(true);
    expect(typeof body.csrf).toBe("string");
    expect(body.csrf.length).toBeGreaterThan(0);
    // BUG-006: login must mint via rotateSessionForUser so any pre-auth
    // ID becomes invalid.
    expect(mockSession.rotate).toHaveBeenCalledWith("u1");

    const setCookies = r.headers["set-cookie"];
    const cookies = Array.isArray(setCookies) ? setCookies : [setCookies];
    expect(cookies.some((c) => String(c).includes("uaSession="))).toBe(true);
    expect(cookies.some((c) => String(c).includes("ua-csrf="))).toBe(true);
  });
});

describe("POST /api/auth/logout", () => {
  it("revokes the session and clears the cookies", async () => {
    mockSession.revoke.mockResolvedValueOnce(undefined);
    const r = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      cookies: { uaSession: "session-id" },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ ok: true });
    expect(mockSession.revoke).toHaveBeenCalledWith("session-id");
  });

  it("succeeds even when no session cookie is sent", async () => {
    const r = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
    });
    expect(r.statusCode).toBe(200);
    expect(mockSession.revoke).not.toHaveBeenCalled();
  });
});

describe("GET /api/auth/me", () => {
  it("returns 401 when no session cookie is sent", async () => {
    const r = await app.inject({ method: "GET", url: "/api/auth/me" });
    expect(r.statusCode).toBe(401);
  });

  it("returns 401 when getSession comes back null", async () => {
    mockSession.get.mockResolvedValueOnce(null);
    const r = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      cookies: { uaSession: "stale" },
    });
    expect(r.statusCode).toBe(401);
  });

  it("returns the user info when the session is valid", async () => {
    mockSession.get.mockResolvedValueOnce({ id: "session", userId: "u1" });
    mockAdminUser.findUnique.mockResolvedValueOnce({
      id: "u1",
      username: "admin",
    });
    const r = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      cookies: { uaSession: "good" },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ id: "u1", username: "admin" });
  });

  it("returns 401 when the user record is gone", async () => {
    mockSession.get.mockResolvedValueOnce({ id: "session", userId: "u1" });
    mockAdminUser.findUnique.mockResolvedValueOnce(null);
    const r = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      cookies: { uaSession: "good" },
    });
    expect(r.statusCode).toBe(401);
  });
});
