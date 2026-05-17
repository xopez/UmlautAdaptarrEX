import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requestMock = vi.fn();

vi.mock("undici", () => ({
  request: (...args: unknown[]) => requestMock(...args),
}));

vi.mock("@/providers/rate-limit", () => ({
  HostRateLimiter: class {
    async wait(): Promise<void> {
      // no-op for tests
    }
  },
}));

import { TvdbProvider } from "@/providers/tvdb";

beforeEach(() => {
  requestMock.mockReset();
});

afterEach(() => {
  requestMock.mockReset();
});

describe("TvdbProvider construction", () => {
  it("requires an api key", () => {
    expect(() => new TvdbProvider({ apiKey: "", userAgent: "UA" })).toThrow(
      /requires an API key/,
    );
  });

  it("declares wildcard supportedLanguages", () => {
    const p = new TvdbProvider({ apiKey: "k", userAgent: "UA" });
    expect(p.supportedLanguages()).toEqual(["*"]);
  });

  it("name is 'tvdb'", () => {
    const p = new TvdbProvider({ apiKey: "k", userAgent: "UA" });
    expect(p.name).toBe("tvdb");
  });
});

describe("TvdbProvider.fetchByExternalId early returns", () => {
  function provider(): TvdbProvider {
    return new TvdbProvider({ apiKey: "k", userAgent: "UA" });
  }

  it("returns null for unsupported media types", async () => {
    expect(await provider().fetchByExternalId("audio", "1")).toBeNull();
    expect(await provider().fetchByExternalId("book", "1")).toBeNull();
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("returns null for non-numeric tv ids", async () => {
    expect(await provider().fetchByExternalId("tv", "not-a-number")).toBeNull();
    expect(await provider().fetchByExternalId("tv", "0")).toBeNull();
  });
});

describe("TvdbProvider.fetchBulk", () => {
  function provider(): TvdbProvider {
    return new TvdbProvider({ apiKey: "k", userAgent: "UA" });
  }

  it("returns an empty map for empty ids and unsupported types", async () => {
    expect((await provider().fetchBulk("tv", [])).size).toBe(0);
    expect((await provider().fetchBulk("audio", ["1"])).size).toBe(0);
  });
});

describe("TvdbProvider.fetchByTitle", () => {
  it("is a no-op (TVDB title search not implemented)", async () => {
    const p = new TvdbProvider({ apiKey: "k", userAgent: "UA" });
    // The class declares a zero-arg fetchByTitle stub on purpose; the
    // wider TitleProvider interface that callers go through accepts the
    // (type, title) signature, so we cast to assert the runtime contract.
    const titleFetch = p.fetchByTitle as unknown as (
      type: string,
      title: string,
    ) => Promise<unknown>;
    expect(await titleFetch.call(p, "tv", "X")).toBeNull();
  });
});
