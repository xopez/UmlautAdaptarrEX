import "./_setup/db";

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { FastifyInstance } from "fastify";

// testConnection makes an HTTP call out via undici; mock the entire module so
// the /instances/test endpoint stays deterministic and offline.
vi.mock("@/arr/test-connection", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/arr/test-connection")>();
  return {
    ...orig,
    testConnection: vi.fn(),
  };
});

import { testConnection } from "@/arr/test-connection";
import { buildTestApp } from "./_setup/app";
import { cleanDb, ensureTestDb } from "./_setup/db";
import {
  authCookies,
  login,
  seedAdminUser,
  sessionCookieOnly,
} from "./_setup/auth-helpers";
import { getAppState } from "@/server/state";

const testConnectionMock = testConnection as unknown as ReturnType<
  typeof vi.fn
>;

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
    data: { id: 1, appApiKey: "bootstrap-key" },
  });
  await getAppState().reloadSettings();
  testConnectionMock.mockReset();
});

interface SerializedInstance {
  id: string;
  type: string;
  name: string;
  host: string;
  apiKey: string;
  enabled: boolean;
  providerOrder: string[] | null;
}

const validSonarr = {
  type: "sonarr",
  name: "Living Room",
  host: "http://sonarr.local",
  apiKey: "real-sonarr-key-1234",
  enabled: true,
  providerOrder: ["pcjones", "tvdb"],
} as const;

describe("ArrInstance CRUD lifecycle", () => {
  it("walks create → list → patch → delete with auth + CSRF", async () => {
    await seedAdminUser();
    const session = await login(app);

    // 1) Empty list to start.
    let listResp = await app.inject({
      method: "GET",
      url: "/api/admin/instances",
      ...sessionCookieOnly(session),
    });
    expect(listResp.statusCode).toBe(200);
    expect(listResp.json()).toEqual([]);

    // 2) Create.
    const createResp = await app.inject({
      method: "POST",
      url: "/api/admin/instances",
      payload: validSonarr,
      ...authCookies(session),
    });
    expect(createResp.statusCode).toBe(200);
    const created = createResp.json() as SerializedInstance;
    expect(created.providerOrder).toEqual(["pcjones", "tvdb"]);
    expect(created.id).toBeTruthy();

    // 3) List shows the new row.
    listResp = await app.inject({
      method: "GET",
      url: "/api/admin/instances",
      ...sessionCookieOnly(session),
    });
    const list = listResp.json() as SerializedInstance[];
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(created.id);

    // 4) Partial update (name + provider order).
    const patchResp = await app.inject({
      method: "PATCH",
      url: `/api/admin/instances/${created.id}`,
      payload: { name: "Renamed", providerOrder: ["tvdb"] },
      ...authCookies(session),
    });
    expect(patchResp.statusCode).toBe(200);
    const updated = patchResp.json() as SerializedInstance;
    expect(updated.name).toBe("Renamed");
    expect(updated.providerOrder).toEqual(["tvdb"]);
    expect(updated.host).toBe(validSonarr.host); // unchanged

    // 5) Delete.
    const deleteResp = await app.inject({
      method: "DELETE",
      url: `/api/admin/instances/${created.id}`,
      ...authCookies(session),
    });
    expect(deleteResp.statusCode).toBe(200);
    expect(deleteResp.json()).toEqual({ ok: true });

    // 6) List empty again.
    listResp = await app.inject({
      method: "GET",
      url: "/api/admin/instances",
      ...sessionCookieOnly(session),
    });
    expect(listResp.json()).toEqual([]);
  });

  it("returns 409 duplicate when (type, name) collides on create", async () => {
    await seedAdminUser();
    const session = await login(app);

    const first = await app.inject({
      method: "POST",
      url: "/api/admin/instances",
      payload: validSonarr,
      ...authCookies(session),
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: "POST",
      url: "/api/admin/instances",
      payload: validSonarr,
      ...authCookies(session),
    });
    expect(second.statusCode).toBe(409);
    expect(second.json()).toMatchObject({ error: "duplicate" });
  });

  it("rejects an invalid host with 400 on create", async () => {
    await seedAdminUser();
    const session = await login(app);
    const r = await app.inject({
      method: "POST",
      url: "/api/admin/instances",
      payload: { ...validSonarr, host: "ftp://nope" },
      ...authCookies(session),
    });
    expect(r.statusCode).toBe(400);
  });

  it("rejects an unauthenticated PATCH with 401 (no CSRF either)", async () => {
    const r = await app.inject({
      method: "PATCH",
      url: "/api/admin/instances/abc",
      payload: { name: "x" },
    });
    expect(r.statusCode).toBe(401);
  });

  it("removes cached search items on delete", async () => {
    await seedAdminUser();
    const session = await login(app);

    const create = await app.inject({
      method: "POST",
      url: "/api/admin/instances",
      payload: validSonarr,
      ...authCookies(session),
    });
    const created = create.json() as SerializedInstance;

    // Index a fake search item linked to this instance, then assert delete
    // wipes it from the in-memory state.
    getAppState().indexItem({
      id: "fake-search-item",
      arrInstanceId: created.id,
      arrId: 999,
      externalId: "tv-100",
      title: "Cached",
      expectedTitle: "Cached",
      expectedAuthor: null,
      germanTitle: null,
      mediaType: "tv",
      year: null,
      titleSearchVariations: [],
      titleMatchVariations: ["Cached"],
      authorMatchVariations: [],
    });
    expect(getAppState().getByExternalId("tv", "tv-100")).not.toBeNull();

    await app.inject({
      method: "DELETE",
      url: `/api/admin/instances/${created.id}`,
      ...authCookies(session),
    });
    expect(getAppState().getByExternalId("tv", "tv-100")).toBeNull();
  });
});

describe("POST /api/admin/instances/test", () => {
  it("forwards a successful probe result to the caller", async () => {
    testConnectionMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      version: "4.0.5",
    });

    await seedAdminUser();
    const session = await login(app);

    const r = await app.inject({
      method: "POST",
      url: "/api/admin/instances/test",
      payload: {
        type: "sonarr",
        host: "http://sonarr.local",
        apiKey: "irrelevant-here",
      },
      ...authCookies(session),
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ ok: true, version: "4.0.5" });
  });

  it("rejects an invalid test payload with 400", async () => {
    await seedAdminUser();
    const session = await login(app);
    const r = await app.inject({
      method: "POST",
      url: "/api/admin/instances/test",
      payload: { type: "sonarr", host: "not-a-url", apiKey: "k" },
      ...authCookies(session),
    });
    expect(r.statusCode).toBe(400);
  });
});

describe("ArrInstance providerOrder serialization", () => {
  it("serializes CSV from DB back to an array on read", async () => {
    await seedAdminUser();
    const session = await login(app);

    // Bypass the route to force a known CSV; the route normalizes to array.
    const { prisma } = await import("@/lib/db");
    await prisma.arrInstance.create({
      data: {
        type: "sonarr",
        name: "Direct",
        host: "http://x",
        apiKey: "k1234567890",
        providerOrder: "pcjones,bogus,pcjones,tvdb",
      },
    });

    const list = await app.inject({
      method: "GET",
      url: "/api/admin/instances",
      ...sessionCookieOnly(session),
    });
    const items = list.json() as SerializedInstance[];
    // Duplicates and unknown ids dropped on the way out.
    expect(items[0]?.providerOrder).toEqual(["pcjones", "tvdb"]);
  });

  it("converts a null providerOrder PATCH back to a stored null", async () => {
    await seedAdminUser();
    const session = await login(app);

    const create = await app.inject({
      method: "POST",
      url: "/api/admin/instances",
      payload: {
        type: "lidarr",
        name: "Music",
        host: "http://lidarr.local",
        apiKey: "lidarr-key-1234",
        enabled: true,
        providerOrder: null,
      },
      ...authCookies(session),
    });
    const created = create.json() as SerializedInstance;

    const patch = await app.inject({
      method: "PATCH",
      url: `/api/admin/instances/${created.id}`,
      payload: { providerOrder: null },
      ...authCookies(session),
    });
    expect(patch.statusCode).toBe(200);
    expect((patch.json() as SerializedInstance).providerOrder).toBeNull();
  });
});
