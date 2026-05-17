import { describe, expect, it } from "vitest";
import { aggregatePlugins } from "@/domain/plugins/aggregate.js";
import { germanUmlauts } from "@/domain/plugins/german-umlauts/index.js";
import { swedishUmlauts } from "@/domain/plugins/swedish-umlauts/index.js";
import { frenchAccents } from "@/domain/plugins/french-accents/index.js";
import { requiredLanguages } from "@/providers/index.js";

describe("LanguagePack.activePlugins (multi-language)", () => {
  it("propagates the active plugin list, in order", () => {
    const pack = aggregatePlugins([germanUmlauts, swedishUmlauts]);
    expect(pack.activePlugins.map((p) => p.id)).toEqual([
      "german-umlauts",
      "swedish-umlauts",
    ]);
  });

  it("each plugin carries an explicit BCP-47 language code", () => {
    expect(germanUmlauts.language).toBe("de");
    expect(swedishUmlauts.language).toBe("sv");
    expect(frenchAccents.language).toBe("fr");
  });
});

describe("requiredLanguages(pack)", () => {
  it("dedupes plugin languages", () => {
    const pack = aggregatePlugins([
      germanUmlauts,
      swedishUmlauts,
      frenchAccents,
    ]);
    expect(requiredLanguages(pack).sort()).toEqual(["de", "fr", "sv"]);
  });

  it("falls back to ['de'] when no plugin is active (legacy behaviour)", () => {
    const pack = aggregatePlugins([]);
    expect(requiredLanguages(pack)).toEqual(["de"]);
  });

  it("non-DE plugin only -> only that lang is asked of the provider", () => {
    const pack = aggregatePlugins([swedishUmlauts]);
    expect(requiredLanguages(pack)).toEqual(["sv"]);
  });
});
