import { describe, expect, it } from "vitest";
import { pickMissingCandidates } from "@/server/title-cache/recheck.js";

const FAR_FUTURE = new Date(Date.now() + 86_400_000);

describe("pickMissingCandidates", () => {
  it("returns rows whose expiresAt is set (whole-row negative cache)", () => {
    const out = pickMissingCandidates(
      [
        {
          id: "tv:1",
          expiresAt: FAR_FUTURE,
          translations: [], // negative TTL, no translation entry
        },
      ],
      ["de"],
    );
    expect(out).toEqual([{ id: "tv:1", type: "tv", externalId: "1" }]);
  });

  it("returns rows where a wantedLang has title=null (per-lang gap)", () => {
    const out = pickMissingCandidates(
      [
        {
          id: "tv:42",
          expiresAt: null,
          translations: [
            { lang: "de", title: "Tatfall" },
            { lang: "sv", title: null }, // SV gap from an earlier sync
          ],
        },
      ],
      ["de", "sv"],
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.externalId).toBe("42");
  });

  it("ignores rows that fully cover all wanted languages", () => {
    const out = pickMissingCandidates(
      [
        {
          id: "tv:7",
          expiresAt: null,
          translations: [
            { lang: "de", title: "Der Magnat" },
            { lang: "sv", title: "Magnaten" },
          ],
        },
      ],
      ["de", "sv"],
    );
    expect(out).toEqual([]);
  });

  it("returns rows missing any wanted lang entry entirely", () => {
    const out = pickMissingCandidates(
      [
        {
          id: "movie:9999",
          expiresAt: null,
          translations: [{ lang: "de", title: "Sample Movie" }],
          // sv requested, but missing from translations -> gap
        },
      ],
      ["de", "sv"],
    );
    expect(out).toEqual([
      { id: "movie:9999", type: "movie", externalId: "9999" },
    ]);
  });

  it("skips non-tv/non-movie cache keys defensively", () => {
    const out = pickMissingCandidates(
      [
        {
          id: "audio:abc",
          expiresAt: FAR_FUTURE,
          translations: [],
        },
        {
          id: "book:def",
          expiresAt: null,
          translations: [{ lang: "de", title: null }],
        },
      ],
      ["de"],
    );
    expect(out).toEqual([]);
  });

  it("skips malformed cache keys (no colon, empty externalId)", () => {
    const out = pickMissingCandidates(
      [
        { id: "broken-no-colon", expiresAt: FAR_FUTURE, translations: [] },
        { id: "tv:", expiresAt: FAR_FUTURE, translations: [] },
        { id: ":missing-type", expiresAt: FAR_FUTURE, translations: [] },
      ],
      ["de"],
    );
    expect(out).toEqual([]);
  });

  it("preserves the externalId verbatim including embedded colons", () => {
    // Defensive: TVDB IDs are numeric, but the function should pass through
    // anything after the first colon.
    const out = pickMissingCandidates(
      [
        {
          id: "movie:tt9999999",
          expiresAt: FAR_FUTURE,
          translations: [],
        },
      ],
      ["de"],
    );
    expect(out[0]?.externalId).toBe("tt9999999");
  });
});
