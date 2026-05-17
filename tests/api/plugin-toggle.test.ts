import "./_setup/db";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "./_setup/app";
import { cleanDb, ensureTestDb } from "./_setup/db";
import {
  authCookies,
  login,
  seedAdminUser,
  sessionCookieOnly,
} from "./_setup/auth-helpers";
import { getAppState } from "@/server/state";
import { BUILTIN_PLUGINS } from "@/domain/plugins";

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
  // Bootstrap-equivalent Setting row so reloadSettings() resolves to a
  // sensible state. tmdbAvailable defaults to false (no key set), which the
  // route uses to gate non-DE plugin enables.
  const { prisma } = await import("@/lib/db");
  await prisma.setting.create({
    data: { id: 1, appApiKey: "bootstrap-key" },
  });
  await getAppState().reloadSettings();
});

interface PluginListEntry {
  id: string;
  enabled: boolean;
  defaultEnabled: boolean;
  language: string;
}

describe("GET /api/admin/plugins", () => {
  it("returns the full built-in registry with default-enabled state", async () => {
    const session = await seedAdminUser().then(() => login(app));
    const r = await app.inject({
      method: "GET",
      url: "/api/admin/plugins",
      ...sessionCookieOnly(session),
    });
    expect(r.statusCode).toBe(200);
    const list = r.json() as PluginListEntry[];
    expect(list).toHaveLength(BUILTIN_PLUGINS.length);
    for (const builtin of BUILTIN_PLUGINS) {
      const matched = list.find((p) => p.id === builtin.id);
      expect(matched?.defaultEnabled).toBe(builtin.defaultEnabled);
    }
  });

  it("rejects unauthenticated requests with 401", async () => {
    const r = await app.inject({
      method: "GET",
      url: "/api/admin/plugins",
    });
    expect(r.statusCode).toBe(401);
  });
});

describe("PATCH /api/admin/plugins/:id", () => {
  it("rejects an unknown plugin id with 404", async () => {
    await seedAdminUser();
    const session = await login(app);
    const r = await app.inject({
      method: "PATCH",
      url: "/api/admin/plugins/not-a-real-plugin",
      payload: { enabled: true },
      ...authCookies(session),
    });
    expect(r.statusCode).toBe(404);
    expect(r.json()).toEqual({ error: "unknown_plugin" });
  });

  it("rejects an invalid body with 400", async () => {
    await seedAdminUser();
    const session = await login(app);
    const target = BUILTIN_PLUGINS[0]!;
    const r = await app.inject({
      method: "PATCH",
      url: `/api/admin/plugins/${target.id}`,
      payload: { enabled: "yes" },
      ...authCookies(session),
    });
    expect(r.statusCode).toBe(400);
  });

  it("blocks enabling a non-DE plugin without a TMDB key", async () => {
    const nonDe = BUILTIN_PLUGINS.find((p) => p.language !== "de");
    if (!nonDe) return;
    await seedAdminUser();
    const session = await login(app);

    const r = await app.inject({
      method: "PATCH",
      url: `/api/admin/plugins/${nonDe.id}`,
      payload: { enabled: true },
      ...authCookies(session),
    });
    expect(r.statusCode).toBe(422);
    expect(r.json()).toMatchObject({
      error: "tmdb_required",
      language: nonDe.language,
    });
  });

  it("succeeds and reports requiresResync when the toggle changed", async () => {
    const target = BUILTIN_PLUGINS.find((p) => p.language === "de");
    if (!target)
      throw new Error("registry must contain at least one DE plugin");

    await seedAdminUser();
    const session = await login(app);

    // Default state was loaded into state.languagePack at boot via
    // reloadSettings → reloadPlugins. Toggle the opposite of the current
    // default so we can assert a real state flip.
    const newEnabled = !target.defaultEnabled;
    const r = await app.inject({
      method: "PATCH",
      url: `/api/admin/plugins/${target.id}`,
      payload: { enabled: newEnabled },
      ...authCookies(session),
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({
      id: target.id,
      enabled: newEnabled,
      requiresResync: true,
    });

    // Persisted in DB.
    const { prisma } = await import("@/lib/db");
    const row = await prisma.plugin.findUnique({ where: { id: target.id } });
    expect(row?.enabled).toBe(newEnabled);

    // In-memory pack reflects the change. When enabling, the plugin shows
    // up in activePlugins; when disabling, it does not.
    const pack = getAppState().languagePack;
    const present = pack.activePlugins.some((p) => p.id === target.id);
    expect(present).toBe(newEnabled);
  });

  it("returns requiresResync=false when the toggle is unchanged", async () => {
    const target = BUILTIN_PLUGINS.find((p) => p.language === "de");
    if (!target) return;
    await seedAdminUser();
    const session = await login(app);

    const r = await app.inject({
      method: "PATCH",
      url: `/api/admin/plugins/${target.id}`,
      payload: { enabled: target.defaultEnabled },
      ...authCookies(session),
    });
    expect(r.statusCode).toBe(200);
    expect((r.json() as { requiresResync: boolean }).requiresResync).toBe(
      false,
    );
  });

  it("rejects PATCH without a CSRF token (state-changing)", async () => {
    const target = BUILTIN_PLUGINS[0]!;
    await seedAdminUser();
    const session = await login(app);
    const r = await app.inject({
      method: "PATCH",
      url: `/api/admin/plugins/${target.id}`,
      payload: { enabled: true },
      cookies: {
        uaSession: session.sessionCookie,
        _csrf: session.signedCsrfCookie,
      },
      // No x-csrf-token header → CSRF check fails.
    });
    expect(r.statusCode).toBe(403);
    expect(r.json()).toEqual({ error: "csrf-invalid" });
  });
});

describe("plugin enabling unblocks once a TMDB key is configured", () => {
  it("toggle non-DE plugin succeeds after tmdbApiKey is set in Setting", async () => {
    const nonDe = BUILTIN_PLUGINS.find((p) => p.language !== "de");
    if (!nonDe) return;

    const { prisma } = await import("@/lib/db");
    await prisma.setting.update({
      where: { id: 1 },
      data: { tmdbApiKey: "0123456789abcdef0123456789abcdef" },
    });
    await getAppState().reloadSettings();

    await seedAdminUser();
    const session = await login(app);

    const r = await app.inject({
      method: "PATCH",
      url: `/api/admin/plugins/${nonDe.id}`,
      payload: { enabled: true },
      ...authCookies(session),
    });
    expect(r.statusCode).toBe(200);
    expect(
      (r.json() as { enabled: boolean; requiresResync: boolean }).enabled,
    ).toBe(true);
  });
});
