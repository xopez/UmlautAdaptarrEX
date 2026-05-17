import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
}));

vi.mock("@/lib/auth/session", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/auth/session")>();
  return {
    ...orig,
    getSession: mockGetSession,
  };
});

import { requireAuth } from "@/server/auth/middleware";
import { SESSION_COOKIE } from "@/lib/auth/session";

let app: FastifyInstance;
const csrfStub = vi.fn();

beforeEach(async () => {
  mockGetSession.mockReset();
  csrfStub.mockReset();
  app = Fastify({ logger: false });
  await app.register(cookie, { secret: "test-secret" });
  // Stand-in for @fastify/csrf-protection's decorator: pass through unless
  // the test instructs the stub to fail (by NOT calling next).
  app.decorate("csrfProtection", (_req, _reply, next) => {
    csrfStub();
    next();
  });
  app.get("/safe", { preHandler: requireAuth }, async (req) => ({
    userId: req.session?.userId ?? null,
  }));
  app.post("/unsafe", { preHandler: requireAuth }, async () => ({ ok: true }));
  await app.ready();
});

afterEach(async () => {
  await app.close();
});

describe("requireAuth on safe methods", () => {
  it("returns 401 when no session cookie is sent", async () => {
    const r = await app.inject({ method: "GET", url: "/safe" });
    expect(r.statusCode).toBe(401);
    expect(r.json()).toEqual({ error: "unauthorized" });
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it("returns 401 when getSession returns null (expired/unknown)", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const r = await app.inject({
      method: "GET",
      url: "/safe",
      cookies: { [SESSION_COOKIE]: "stale-id" },
    });
    expect(r.statusCode).toBe(401);
  });

  it("attaches the session to req on success and skips CSRF for GET", async () => {
    mockGetSession.mockResolvedValueOnce({ id: "good", userId: "user-1" });
    const r = await app.inject({
      method: "GET",
      url: "/safe",
      cookies: { [SESSION_COOKIE]: "good" },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ userId: "user-1" });
    expect(csrfStub).not.toHaveBeenCalled();
  });
});

describe("requireAuth on unsafe methods", () => {
  it("invokes csrfProtection on POST when authenticated", async () => {
    mockGetSession.mockResolvedValueOnce({ id: "good", userId: "user-1" });
    const r = await app.inject({
      method: "POST",
      url: "/unsafe",
      cookies: { [SESSION_COOKIE]: "good" },
    });
    expect(r.statusCode).toBe(200);
    expect(csrfStub).toHaveBeenCalledOnce();
  });

  it("returns 401 before reaching CSRF when there is no session", async () => {
    const r = await app.inject({ method: "POST", url: "/unsafe" });
    expect(r.statusCode).toBe(401);
    expect(csrfStub).not.toHaveBeenCalled();
  });
});
