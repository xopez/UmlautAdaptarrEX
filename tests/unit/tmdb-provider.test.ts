import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockMovieDb } = vi.hoisted(() => ({
  mockMovieDb: {
    movieInfo: vi.fn(),
    movieTranslations: vi.fn(),
    movieAlternativeTitles: vi.fn(),
    tvTranslations: vi.fn(),
    tvAlternativeTitles: vi.fn(),
  },
}));

vi.mock("moviedb-promise", () => ({
  MovieDb: class {
    movieInfo = mockMovieDb.movieInfo;
    movieTranslations = mockMovieDb.movieTranslations;
    movieAlternativeTitles = mockMovieDb.movieAlternativeTitles;
    tvTranslations = mockMovieDb.tvTranslations;
    tvAlternativeTitles = mockMovieDb.tvAlternativeTitles;
  },
}));

vi.mock("@/providers/rate-limit", () => ({
  HostRateLimiter: class {
    async wait(): Promise<void> {
      // no-op for tests
    }
  },
}));

import {
  looksLikeTmdbV4Token,
  probeTmdbKey,
  TmdbProvider,
} from "@/providers/tmdb";

beforeEach(() => {
  for (const m of Object.values(mockMovieDb)) m.mockReset();
});

afterEach(() => {
  for (const m of Object.values(mockMovieDb)) m.mockReset();
});

describe("looksLikeTmdbV4Token", () => {
  it("flags JWT-shaped strings as v4 tokens", () => {
    expect(looksLikeTmdbV4Token("eyJabcdef.payload.signature")).toBe(true);
    expect(looksLikeTmdbV4Token("eyJ0eXA.body.sig")).toBe(true);
  });

  it("does not flag plain hex v3 keys", () => {
    expect(looksLikeTmdbV4Token("0123456789abcdef0123456789abcdef")).toBe(
      false,
    );
  });

  it("does not flag empty strings", () => {
    expect(looksLikeTmdbV4Token("")).toBe(false);
  });
});

describe("probeTmdbKey", () => {
  it("rejects an empty key without making a network call", async () => {
    const r = await probeTmdbKey("");
    expect(r).toEqual({ ok: false, code: "missing" });
    expect(mockMovieDb.movieInfo).not.toHaveBeenCalled();
  });

  it("rejects a v4 token", async () => {
    const r = await probeTmdbKey("eyJabc.def.ghi");
    expect(r).toEqual({ ok: false, code: "v4_token" });
  });

  it("rejects a key shorter than 16 characters", async () => {
    const r = await probeTmdbKey("short");
    expect(r).toEqual({ ok: false, code: "invalid_format" });
  });

  it("returns ok with the movie title on a 200 response", async () => {
    mockMovieDb.movieInfo.mockResolvedValueOnce({ title: "Sample Movie" });
    const r = await probeTmdbKey("0123456789abcdef0123456789abcdef");
    expect(r).toEqual({ ok: true, sample: { id: 550, title: "Sample Movie" } });
  });

  it("falls back to original_title when title is missing", async () => {
    mockMovieDb.movieInfo.mockResolvedValueOnce({
      original_title: "Original",
    });
    const r = await probeTmdbKey("0123456789abcdef0123456789abcdef");
    expect(r).toEqual({ ok: true, sample: { id: 550, title: "Original" } });
  });

  it("maps a 401 to code='unauthorized'", async () => {
    mockMovieDb.movieInfo.mockRejectedValueOnce({ response: { status: 401 } });
    const r = await probeTmdbKey("0123456789abcdef0123456789abcdef");
    expect(r).toEqual({ ok: false, code: "unauthorized" });
  });

  it("maps a network error (no status) to code='network'", async () => {
    mockMovieDb.movieInfo.mockRejectedValueOnce(new Error("ECONNRESET"));
    const r = await probeTmdbKey("0123456789abcdef0123456789abcdef");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("network");
  });

  it("maps non-401 HTTP errors to code='unknown'", async () => {
    mockMovieDb.movieInfo.mockRejectedValueOnce({ response: { status: 500 } });
    const r = await probeTmdbKey("0123456789abcdef0123456789abcdef");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("unknown");
  });
});

describe("TmdbProvider construction", () => {
  it("throws when constructed with a v4 token", () => {
    expect(
      () =>
        new TmdbProvider({
          apiKey: "eyJabc.def.ghi",
          userAgent: "UA",
        }),
    ).toThrow(/v3 API key/);
  });

  it("declares all-language support via '*'", () => {
    const p = new TmdbProvider({
      apiKey: "0123456789abcdef0123456789abcdef",
      userAgent: "UA",
    });
    expect(p.supportedLanguages()).toEqual(["*"]);
  });

  it("fetchByTitle is intentionally a no-op", async () => {
    const p = new TmdbProvider({
      apiKey: "0123456789abcdef0123456789abcdef",
      userAgent: "UA",
    });
    expect(await p.fetchByTitle()).toBeNull();
  });
});

describe("TmdbProvider.fetchByExternalId", () => {
  function provider(): TmdbProvider {
    return new TmdbProvider({
      apiKey: "0123456789abcdef0123456789abcdef",
      userAgent: "UA",
    });
  }

  it("returns null for non-movie/tv types", async () => {
    expect(await provider().fetchByExternalId("audio", "1")).toBeNull();
  });

  it("returns null for non-numeric external ids", async () => {
    expect(await provider().fetchByExternalId("movie", "abc")).toBeNull();
    expect(mockMovieDb.movieTranslations).not.toHaveBeenCalled();
  });

  it("returns a payload built from movie translations and alternative titles", async () => {
    mockMovieDb.movieTranslations.mockResolvedValueOnce({
      translations: [
        { iso_639_1: "de", data: { title: "Der Film" } },
        { iso_639_1: "fr", data: { title: "Le Film" } },
      ],
    });
    mockMovieDb.movieAlternativeTitles.mockResolvedValueOnce({
      titles: [
        { iso_3166_1: "DE", title: "Alt Title" },
        { iso_3166_1: "AT", title: "AT Variant" },
      ],
    });

    const out = await provider().fetchByExternalId("movie", "550");
    expect(out?.titlesByLang).toEqual({ de: "Der Film", fr: "Le Film" });
    expect(out?.aliasesByLang?.de).toEqual(["Alt Title", "AT Variant"]);
  });

  it("filters titles by requested languages when '*' is not in the list", async () => {
    mockMovieDb.movieTranslations.mockResolvedValueOnce({
      translations: [
        { iso_639_1: "de", data: { title: "DE" } },
        { iso_639_1: "es", data: { title: "ES" } },
      ],
    });
    mockMovieDb.movieAlternativeTitles.mockResolvedValueOnce({ titles: [] });

    const out = await provider().fetchByExternalId("movie", "1", ["de"]);
    expect(out?.titlesByLang).toEqual({ de: "DE" });
  });

  it("returns null when neither titles nor aliases match the requested langs", async () => {
    mockMovieDb.movieTranslations.mockResolvedValueOnce({
      translations: [{ iso_639_1: "es", data: { title: "ES" } }],
    });
    mockMovieDb.movieAlternativeTitles.mockResolvedValueOnce({ titles: [] });

    const out = await provider().fetchByExternalId("movie", "1", ["de"]);
    expect(out).toBeNull();
  });

  it("uses TV endpoints for tv lookups (results vs titles key)", async () => {
    mockMovieDb.tvTranslations.mockResolvedValueOnce({
      translations: [{ iso_639_1: "de", data: { name: "Die Show" } }],
    });
    mockMovieDb.tvAlternativeTitles.mockResolvedValueOnce({
      results: [{ iso_3166_1: "DE", title: "Show DE" }],
    });

    const out = await provider().fetchByExternalId("tv", "100");
    expect(out?.titlesByLang).toEqual({ de: "Die Show" });
    expect(out?.aliasesByLang?.de).toEqual(["Show DE"]);
  });

  it("returns null on a TMDB error", async () => {
    mockMovieDb.movieTranslations.mockRejectedValueOnce({
      response: { status: 401 },
    });
    mockMovieDb.movieAlternativeTitles.mockRejectedValueOnce({
      response: { status: 401 },
    });
    expect(await provider().fetchByExternalId("movie", "1")).toBeNull();
  });

  it("does not include duplicate aliases for the same lang", async () => {
    mockMovieDb.movieTranslations.mockResolvedValueOnce({ translations: [] });
    mockMovieDb.movieAlternativeTitles.mockResolvedValueOnce({
      titles: [
        { iso_3166_1: "DE", title: "Same" },
        { iso_3166_1: "DE", title: "Same" },
        { iso_3166_1: "AT", title: "Same" },
      ],
    });
    const out = await provider().fetchByExternalId("movie", "1", ["de"]);
    expect(out?.aliasesByLang?.de).toEqual(["Same"]);
  });
});

describe("TmdbProvider.fetchBulk", () => {
  function provider(): TmdbProvider {
    return new TmdbProvider({
      apiKey: "0123456789abcdef0123456789abcdef",
      userAgent: "UA",
    });
  }

  it("returns an empty map for an empty list", async () => {
    expect((await provider().fetchBulk("movie", [])).size).toBe(0);
  });

  it("returns an empty map for unsupported media types", async () => {
    expect((await provider().fetchBulk("audio", ["1"])).size).toBe(0);
  });

  it("calls fetchByExternalId for each id and merges hits", async () => {
    mockMovieDb.movieTranslations.mockResolvedValue({
      translations: [{ iso_639_1: "de", data: { title: "T" } }],
    });
    mockMovieDb.movieAlternativeTitles.mockResolvedValue({ titles: [] });

    const out = await provider().fetchBulk("movie", ["1", "2"], ["de"]);
    expect(out.size).toBe(2);
  });
});
