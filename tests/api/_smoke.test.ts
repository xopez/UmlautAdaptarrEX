import "./_setup/db";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureTestDb, cleanDb } from "./_setup/db";

describe("api test infrastructure", () => {
  beforeAll(async () => {
    await ensureTestDb();
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.$disconnect();
  });

  it("can connect to the test SQLite and insert a row", async () => {
    await cleanDb();
    const { prisma } = await import("@/lib/db");
    await prisma.adminUser.create({
      data: { username: "test", passwordHash: "hash" },
    });
    const count = await prisma.adminUser.count();
    expect(count).toBe(1);
  });

  it("cleanDb wipes between tests", async () => {
    const { prisma } = await import("@/lib/db");
    expect(await prisma.adminUser.count()).toBe(1);
    await cleanDb();
    expect(await prisma.adminUser.count()).toBe(0);
  });
});
