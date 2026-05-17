import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockSetting } = vi.hoisted(() => ({
  mockSetting: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: { setting: mockSetting },
}));

import {
  _resetCsrfSecretForTests,
  ensureCsrfSecret,
  getCsrfSecret,
} from "@/lib/auth/csrf";

beforeEach(() => {
  vi.unstubAllEnvs();
  _resetCsrfSecretForTests();
  mockSetting.findUnique.mockReset();
  mockSetting.upsert.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ensureCsrfSecret", () => {
  it("uses CSRF_SECRET env override and skips the database", async () => {
    vi.stubEnv("CSRF_SECRET", "env-provided-secret");

    await ensureCsrfSecret();

    expect(getCsrfSecret().toString("utf8")).toBe("env-provided-secret");
    expect(mockSetting.findUnique).not.toHaveBeenCalled();
    expect(mockSetting.upsert).not.toHaveBeenCalled();
  });

  it("decodes an existing base64 secret stored in the database", async () => {
    vi.stubEnv("CSRF_SECRET", "");
    const stored = Buffer.from("stored-secret-bytes").toString("base64");
    mockSetting.findUnique.mockResolvedValueOnce({ csrfSecret: stored });

    await ensureCsrfSecret();

    expect(getCsrfSecret().toString("utf8")).toBe("stored-secret-bytes");
    expect(mockSetting.upsert).not.toHaveBeenCalled();
  });

  it("creates and persists a fresh 32-byte secret when none exists", async () => {
    vi.stubEnv("CSRF_SECRET", "");
    const persistedBase64 = Buffer.from(
      "post-upsert-secret-bytes-padded-to-32",
    ).toString("base64");
    mockSetting.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ csrfSecret: persistedBase64 });
    mockSetting.upsert.mockResolvedValueOnce({});

    await ensureCsrfSecret();

    expect(mockSetting.upsert).toHaveBeenCalledOnce();
    const upsertArgs = mockSetting.upsert.mock.calls[0]?.[0] as {
      where: { id: number };
      create: { id: number; appApiKey: string; csrfSecret: string };
    };
    expect(upsertArgs.where).toEqual({ id: 1 });
    expect(upsertArgs.create.id).toBe(1);
    // create-path uses a non-empty appApiKey to avoid the legacy "empty key
    // = open access" trap during the bootstrap window.
    expect(upsertArgs.create.appApiKey).not.toBe("");
    expect(upsertArgs.create.csrfSecret).toMatch(/^[A-Za-z0-9+/=]+$/);

    expect(getCsrfSecret().toString("base64")).toBe(persistedBase64);
  });

  it("falls back to the freshly generated secret when the re-read returns nothing", async () => {
    vi.stubEnv("CSRF_SECRET", "");
    mockSetting.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockSetting.upsert.mockResolvedValueOnce({});

    await ensureCsrfSecret();

    expect(getCsrfSecret().length).toBe(32);
  });

  it("returns early on subsequent calls without re-reading the env", async () => {
    vi.stubEnv("CSRF_SECRET", "first");
    await ensureCsrfSecret();

    vi.stubEnv("CSRF_SECRET", "second");
    await ensureCsrfSecret();

    expect(getCsrfSecret().toString("utf8")).toBe("first");
  });
});

describe("getCsrfSecret", () => {
  it("throws when called before ensureCsrfSecret()", () => {
    expect(() => getCsrfSecret()).toThrow(/not initialized/);
  });
});

describe("_resetCsrfSecretForTests", () => {
  it("clears the cached secret so a re-init can run", async () => {
    vi.stubEnv("CSRF_SECRET", "any");
    await ensureCsrfSecret();
    expect(() => getCsrfSecret()).not.toThrow();

    _resetCsrfSecretForTests();

    expect(() => getCsrfSecret()).toThrow(/not initialized/);
  });

  it("refuses to run when NODE_ENV is production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => _resetCsrfSecretForTests()).toThrow(
      /must not be called in production/,
    );
  });
});
