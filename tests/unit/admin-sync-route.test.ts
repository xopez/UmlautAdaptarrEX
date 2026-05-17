import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/middleware", () => ({
  requireAuth: async () => {
    /* no-op for unit tests */
  },
}));

const { mockSyncRun } = vi.hoisted(() => ({
  mockSyncRun: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: { syncRun: mockSyncRun },
}));

import { syncRoutes } from "@/server/routes/admin/sync";

interface FakeScheduler {
  runNow: ReturnType<typeof vi.fn>;
}

let app: ReturnType<typeof Fastify>;
let scheduler: FakeScheduler;

beforeEach(async () => {
  mockSyncRun.findMany.mockReset();
  scheduler = { runNow: vi.fn() };
  app = Fastify({ logger: false });
  await syncRoutes(app, { scheduler: scheduler as never });
  await app.ready();
});

afterEach(async () => {
  await app.close();
});

describe("POST /api/admin/sync", () => {
  it("returns 202 when the scheduler accepts the run", async () => {
    scheduler.runNow.mockResolvedValueOnce({
      status: "started",
      runIds: ["r1", "r2"],
      instanceCount: 2,
    });
    const r = await app.inject({ method: "POST", url: "/api/admin/sync" });
    expect(r.statusCode).toBe(202);
    expect(r.json()).toEqual({
      ok: true,
      runIds: ["r1", "r2"],
      instanceCount: 2,
    });
  });

  it("forwards the optional instanceId from the body", async () => {
    scheduler.runNow.mockResolvedValueOnce({
      status: "started",
      runIds: ["r1"],
      instanceCount: 1,
    });
    await app.inject({
      method: "POST",
      url: "/api/admin/sync",
      payload: { instanceId: "abc-123" },
    });
    expect(scheduler.runNow).toHaveBeenCalledWith("abc-123");
  });

  it("maps no_provider to a 409", async () => {
    scheduler.runNow.mockResolvedValueOnce({ status: "no_provider" });
    const r = await app.inject({ method: "POST", url: "/api/admin/sync" });
    expect(r.statusCode).toBe(409);
    expect(r.json()).toMatchObject({ error: "no_provider" });
  });

  it("maps already_running to a 409", async () => {
    scheduler.runNow.mockResolvedValueOnce({ status: "already_running" });
    const r = await app.inject({ method: "POST", url: "/api/admin/sync" });
    expect(r.statusCode).toBe(409);
    expect(r.json()).toMatchObject({ error: "already_running" });
  });

  it("maps no_instances to a 409", async () => {
    scheduler.runNow.mockResolvedValueOnce({ status: "no_instances" });
    const r = await app.inject({ method: "POST", url: "/api/admin/sync" });
    expect(r.statusCode).toBe(409);
    expect(r.json()).toMatchObject({ error: "no_instances" });
  });
});

describe("GET /api/admin/sync-runs", () => {
  it("returns the most recent runs with default take=20", async () => {
    mockSyncRun.findMany.mockResolvedValueOnce([{ id: "r1" }, { id: "r2" }]);
    const r = await app.inject({ method: "GET", url: "/api/admin/sync-runs" });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual([{ id: "r1" }, { id: "r2" }]);
    const args = mockSyncRun.findMany.mock.calls[0]?.[0] as { take: number };
    expect(args.take).toBe(20);
  });

  it("clamps the take parameter at 200", async () => {
    mockSyncRun.findMany.mockResolvedValueOnce([]);
    await app.inject({
      method: "GET",
      url: "/api/admin/sync-runs?take=999",
    });
    const args = mockSyncRun.findMany.mock.calls[0]?.[0] as { take: number };
    expect(args.take).toBe(200);
  });

  it("queries by ids when the ids parameter is supplied", async () => {
    mockSyncRun.findMany.mockResolvedValueOnce([]);
    await app.inject({
      method: "GET",
      url: "/api/admin/sync-runs?ids=a,b,c,",
    });
    const args = mockSyncRun.findMany.mock.calls[0]?.[0] as {
      where: { id: { in: string[] } };
    };
    expect(args.where.id.in).toEqual(["a", "b", "c"]);
  });

  it("returns an empty array when ids resolves to none", async () => {
    const r = await app.inject({
      method: "GET",
      url: "/api/admin/sync-runs?ids=,,",
    });
    expect(r.json()).toEqual([]);
    expect(mockSyncRun.findMany).not.toHaveBeenCalled();
  });

  it("rejects pathologically long ids strings", async () => {
    const huge = "x," + "y,".repeat(10_000);
    const r = await app.inject({
      method: "GET",
      url: `/api/admin/sync-runs?ids=${huge}`,
    });
    expect(r.json()).toEqual([]);
    expect(mockSyncRun.findMany).not.toHaveBeenCalled();
  });
});
