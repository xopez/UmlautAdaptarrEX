import { describe, expect, it } from "vitest";
import { makeTitlePayload, mergePayloads } from "@/providers/types.js";
import { looksLikeTmdbV4Token } from "@/providers/tmdb.js";

describe("makeTitlePayload", () => {
  it("derives germanTitle and aliases from titlesByLang.de + aliasesByLang.de", () => {
    const p = makeTitlePayload({
      titlesByLang: { de: "Der Magnat", sv: "Magnaten" },
      aliasesByLang: { de: ["Der Magnat (1971)"] },
      externalId: "238",
    });
    expect(p.germanTitle).toBe("Der Magnat");
    expect(p.aliases).toEqual(["Der Magnat (1971)"]);
    expect(p.titlesByLang.sv).toBe("Magnaten");
  });

  it("backward-compat fields are null when DE is absent", () => {
    const p = makeTitlePayload({
      titlesByLang: { sv: "Stugan" },
      externalId: "82728",
    });
    expect(p.germanTitle).toBeNull();
    expect(p.aliases).toBeNull();
  });
});

describe("mergePayloads", () => {
  it("primary wins per-lang; secondary fills missing langs", () => {
    const a = makeTitlePayload({
      titlesByLang: { de: "Der Magnat" },
      externalId: "238",
    });
    const b = makeTitlePayload({
      titlesByLang: { de: "Magnat", sv: "Magnaten", fr: "Le Magnat" },
      externalId: "238",
    });
    const merged = mergePayloads(a, b)!;
    expect(merged.titlesByLang.de).toBe("Der Magnat");
    expect(merged.titlesByLang.sv).toBe("Magnaten");
    expect(merged.titlesByLang.fr).toBe("Le Magnat");
  });

  it("aliases are merged and de-duplicated per language", () => {
    const a = makeTitlePayload({
      titlesByLang: {},
      aliasesByLang: { de: ["Magnat I"] },
    });
    const b = makeTitlePayload({
      titlesByLang: {},
      aliasesByLang: { de: ["Magnat I", "Magnat"] },
    });
    const merged = mergePayloads(a, b)!;
    expect(merged.aliasesByLang?.de).toEqual(["Magnat I", "Magnat"]);
  });

  it("returns the non-null operand when one side is null", () => {
    const a = makeTitlePayload({ titlesByLang: { de: "X" } });
    expect(mergePayloads(a, null)).toBe(a);
    expect(mergePayloads(null, a)).toBe(a);
    expect(mergePayloads(null, null)).toBeNull();
  });
});

describe("looksLikeTmdbV4Token", () => {
  it("rejects v3 hex API keys", () => {
    expect(looksLikeTmdbV4Token("0123456789abcdef0123456789abcdef")).toBe(
      false,
    );
  });

  it("detects v4 read access tokens (JWT-shaped)", () => {
    expect(
      looksLikeTmdbV4Token(
        "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.signaturepart",
      ),
    ).toBe(true);
  });
});
