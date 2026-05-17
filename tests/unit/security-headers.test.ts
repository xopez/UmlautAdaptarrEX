import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applySecurityHeaders } from "@/server/security-headers";

let app: ReturnType<typeof Fastify>;

beforeEach(async () => {
  app = Fastify({ logger: false });
  applySecurityHeaders(app);
  app.get("/", async () => ({ ok: true }));
  await app.ready();
});

afterEach(async () => {
  await app.close();
});

describe("applySecurityHeaders", () => {
  it("sets X-Frame-Options to DENY", async () => {
    const res = await app.inject({ method: "GET", url: "/" });
    expect(res.headers["x-frame-options"]).toBe("DENY");
  });

  it("sets X-Content-Type-Options to nosniff", async () => {
    const res = await app.inject({ method: "GET", url: "/" });
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("sets Referrer-Policy to same-origin", async () => {
    const res = await app.inject({ method: "GET", url: "/" });
    expect(res.headers["referrer-policy"]).toBe("same-origin");
  });

  it("sets X-DNS-Prefetch-Control to off", async () => {
    const res = await app.inject({ method: "GET", url: "/" });
    expect(res.headers["x-dns-prefetch-control"]).toBe("off");
  });

  it("sets a restrictive Permissions-Policy", async () => {
    const res = await app.inject({ method: "GET", url: "/" });
    const policy = res.headers["permissions-policy"] as string;
    expect(policy).toContain("camera=()");
    expect(policy).toContain("microphone=()");
    expect(policy).toContain("geolocation=()");
    expect(policy).toContain("interest-cohort=()");
  });

  it("does not set HSTS (left to the reverse proxy)", async () => {
    const res = await app.inject({ method: "GET", url: "/" });
    expect(res.headers["strict-transport-security"]).toBeUndefined();
  });
});
