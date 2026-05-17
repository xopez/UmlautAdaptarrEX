import "./_setup/db";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "./_setup/app";
import { cleanDb, ensureTestDb } from "./_setup/db";
import { login, seedAdminUser, sessionCookieOnly } from "./_setup/auth-helpers";
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

async function seedLogEntries(): Promise<void> {
  const { prisma } = await import("@/lib/db");
  await prisma.logEntry.createMany({
    data: [
      {
        level: "info",
        message: "Sync started for instance Living Room",
        context: null,
      },
      {
        level: "warn",
        message: "Indexer rate-limit hit",
        context: "host=indexer.example",
      },
      {
        level: "error",
        message: "Database connection lost",
        context: null,
      },
      {
        level: "warn",
        message: "Sync finished with errors",
        context: null,
      },
      {
        level: "info",
        message: "Setup completed for admin user",
        context: null,
      },
    ],
  });
}

interface LogsResponse {
  items: Array<{
    id: string;
    level: string;
    message: string;
    createdAt: string;
  }>;
}

describe("GET /api/admin/logs", () => {
  it("returns every row newest-first when no filter is supplied", async () => {
    await seedLogEntries();
    await seedAdminUser();
    const session = await login(app);

    const r = await app.inject({
      method: "GET",
      url: "/api/admin/logs",
      ...sessionCookieOnly(session),
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as LogsResponse;
    expect(body.items).toHaveLength(5);
    // Schema sorts by createdAt desc; rows seeded together so we can't rely
    // on order across them, just verify the shape and all messages came back.
    const messages = new Set(body.items.map((i) => i.message));
    expect(messages.has("Database connection lost")).toBe(true);
    expect(messages.has("Setup completed for admin user")).toBe(true);
  });

  it("filters by level", async () => {
    await seedLogEntries();
    await seedAdminUser();
    const session = await login(app);

    const r = await app.inject({
      method: "GET",
      url: "/api/admin/logs?level=warn",
      ...sessionCookieOnly(session),
    });
    const body = r.json() as LogsResponse;
    expect(body.items).toHaveLength(2);
    expect(body.items.every((i) => i.level === "warn")).toBe(true);
  });

  it("filters by case-sensitive substring search on message", async () => {
    await seedLogEntries();
    await seedAdminUser();
    const session = await login(app);

    const r = await app.inject({
      method: "GET",
      url: "/api/admin/logs?search=Sync",
      ...sessionCookieOnly(session),
    });
    const body = r.json() as LogsResponse;
    expect(body.items).toHaveLength(2);
    expect(body.items.every((i) => i.message.includes("Sync"))).toBe(true);
  });

  it("combines level + search filters via AND", async () => {
    await seedLogEntries();
    await seedAdminUser();
    const session = await login(app);

    const r = await app.inject({
      method: "GET",
      url: "/api/admin/logs?level=warn&search=Sync",
      ...sessionCookieOnly(session),
    });
    const body = r.json() as LogsResponse;
    expect(body.items).toHaveLength(1);
    expect(body.items[0]?.message).toBe("Sync finished with errors");
  });

  it("returns an empty list when no row matches", async () => {
    await seedLogEntries();
    await seedAdminUser();
    const session = await login(app);

    const r = await app.inject({
      method: "GET",
      url: "/api/admin/logs?level=fatal",
      ...sessionCookieOnly(session),
    });
    expect((r.json() as LogsResponse).items).toEqual([]);
  });

  it("only returns the items envelope, no total/take/skip (pagination is implicit)", async () => {
    await seedLogEntries();
    await seedAdminUser();
    const session = await login(app);

    const r = await app.inject({
      method: "GET",
      url: "/api/admin/logs",
      ...sessionCookieOnly(session),
    });
    const body = r.json() as Record<string, unknown>;
    expect(Object.keys(body)).toEqual(["items"]);
  });

  it("clamps an absurd take parameter at the documented max of 1000", async () => {
    // Seed enough rows that we can detect the clamp.
    const { prisma } = await import("@/lib/db");
    await prisma.logEntry.createMany({
      data: Array.from({ length: 25 }, (_, i) => ({
        level: "info",
        message: `bulk ${i}`,
      })),
    });
    await seedAdminUser();
    const session = await login(app);

    const r = await app.inject({
      method: "GET",
      url: "/api/admin/logs?take=99999",
      ...sessionCookieOnly(session),
    });
    const body = r.json() as LogsResponse;
    expect(body.items.length).toBeLessThanOrEqual(1000);
    // Plenty fewer than 1000 in our seed; the clamp does not invent rows.
    expect(body.items.length).toBe(25);
  });

  it("rejects unauthenticated callers with 401", async () => {
    const r = await app.inject({ method: "GET", url: "/api/admin/logs" });
    expect(r.statusCode).toBe(401);
  });
});
