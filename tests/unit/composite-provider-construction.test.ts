import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockTmdbCtor, mockTvdbCtor, mockPcjonesCtor } = vi.hoisted(() => ({
  mockTmdbCtor: vi.fn(),
  mockTvdbCtor: vi.fn(),
  mockPcjonesCtor: vi.fn(),
}));

vi.mock("@/providers/pcjones-api", () => ({
  PcjonesApiProvider: class {
    constructor(opts: unknown) {
      mockPcjonesCtor(opts);
    }
    supportedLanguages() {
      return ["de"];
    }
  },
}));

vi.mock("@/providers/tmdb", () => ({
  looksLikeTmdbV4Token: (k: string) => k.startsWith("eyJ"),
  TmdbProvider: class {
    constructor(opts: unknown) {
      mockTmdbCtor(opts);
    }
    supportedLanguages() {
      return ["*"];
    }
  },
}));

vi.mock("@/providers/tvdb", () => ({
  TvdbProvider: class {
    constructor(opts: unknown) {
      mockTvdbCtor(opts);
    }
    supportedLanguages() {
      return ["*"];
    }
  },
}));

import { CompositeTitleProvider, requiredLanguages } from "@/providers";

beforeEach(() => {
  mockTmdbCtor.mockReset();
  mockTvdbCtor.mockReset();
  mockPcjonesCtor.mockReset();
});

afterEach(() => {
  mockTmdbCtor.mockReset();
  mockTvdbCtor.mockReset();
  mockPcjonesCtor.mockReset();
});

describe("requiredLanguages", () => {
  it("falls back to ['de'] when no plugins are active", () => {
    expect(requiredLanguages({ activePlugins: [] } as never)).toEqual(["de"]);
  });

  it("returns the unique language codes of every active plugin", () => {
    const langs = requiredLanguages({
      activePlugins: [
        { language: "de" },
        { language: "sv" },
        { language: "de" },
        { language: "fr" },
      ],
    } as never);
    expect(new Set(langs)).toEqual(new Set(["de", "sv", "fr"]));
  });
});

describe("CompositeTitleProvider construction", () => {
  it("instantiates pcjones unconditionally and skips TMDB/TVDB when keys are missing", () => {
    const p = new CompositeTitleProvider({
      titleApiHost: "https://api.example",
      tmdbApiKey: null,
      tvdbApiKey: null,
      userAgent: "UA",
      providerOrder: ["pcjones"],
    });
    expect(mockPcjonesCtor).toHaveBeenCalledOnce();
    expect(mockTmdbCtor).not.toHaveBeenCalled();
    expect(mockTvdbCtor).not.toHaveBeenCalled();
    expect(p.name).toBe("composite(pcjones)");
  });

  it("falls back to the default order when an empty order is supplied", () => {
    const p = new CompositeTitleProvider({
      titleApiHost: "https://api.example",
      tmdbApiKey: null,
      tvdbApiKey: null,
      userAgent: "UA",
      providerOrder: [],
    });
    expect(p.name).toBe("composite(pcjones,tvdb,tmdb)");
  });

  it("skips TMDB when the configured key is a v4 read-access token", () => {
    new CompositeTitleProvider({
      titleApiHost: "https://api.example",
      tmdbApiKey: "eyJabc.def.ghi",
      tvdbApiKey: null,
      userAgent: "UA",
      providerOrder: ["tmdb"],
    });
    expect(mockTmdbCtor).not.toHaveBeenCalled();
  });

  it("instantiates TMDB and TVDB when both keys are present and valid", () => {
    new CompositeTitleProvider({
      titleApiHost: "https://api.example",
      tmdbApiKey: "0123456789abcdef0123456789abcdef",
      tvdbApiKey: "tvdb-key",
      tvdbPin: "PIN",
      userAgent: "UA",
      providerOrder: ["pcjones", "tvdb", "tmdb"],
    });
    expect(mockTmdbCtor).toHaveBeenCalledOnce();
    expect(mockTvdbCtor).toHaveBeenCalledOnce();
  });

  it("declares wildcard supportedLanguages", () => {
    const p = new CompositeTitleProvider({
      titleApiHost: "https://api.example",
      tmdbApiKey: null,
      tvdbApiKey: null,
      userAgent: "UA",
      providerOrder: ["pcjones"],
    });
    expect(p.supportedLanguages()).toEqual(["*"]);
  });

  it("returns an empty map for fetchBulk on unsupported types and empty ids", async () => {
    const p = new CompositeTitleProvider({
      titleApiHost: "https://api.example",
      tmdbApiKey: null,
      tvdbApiKey: null,
      userAgent: "UA",
      providerOrder: ["pcjones"],
    });
    expect((await p.fetchBulk("audio", ["1"])).size).toBe(0);
    expect((await p.fetchBulk("tv", [])).size).toBe(0);
  });

  it("returns null from fetchByExternalId for unsupported types", async () => {
    const p = new CompositeTitleProvider({
      titleApiHost: "https://api.example",
      tmdbApiKey: null,
      tvdbApiKey: null,
      userAgent: "UA",
      providerOrder: ["pcjones"],
    });
    expect(await p.fetchByExternalId("audio", "1")).toBeNull();
  });

  it("returns null from fetchByTitle for unsupported types", async () => {
    const p = new CompositeTitleProvider({
      titleApiHost: "https://api.example",
      tmdbApiKey: null,
      tvdbApiKey: null,
      userAgent: "UA",
      providerOrder: ["pcjones"],
    });
    expect(await p.fetchByTitle("audio", "x")).toBeNull();
  });
});
