import { describe, expect, it } from "vitest";
import { aggregatePlugins } from "@/domain/plugins/aggregate.js";
import { frenchAccents } from "@/domain/plugins/french-accents/index.js";
import { generateVariations } from "@/domain/variations/generate.js";

const frenchPack = aggregatePlugins([frenchAccents]);

describe("french-accents plugin", () => {
  it("Mémoire → contains stripped variant", () => {
    const v = generateVariations("Mémoire", "tv", frenchPack);
    expect(v).toContain("Mémoire");
    expect(v).toContain("Memoire"); // é → e
  });

  it("Cœur → ligature is expanded", () => {
    const v = generateVariations("Cœur", "tv", frenchPack);
    expect(v).toContain("Cœur");
    expect(v).toContain("Coeur"); // œ → oe
  });

  it("Bœuf à la mode → strips accents and expands ligature", () => {
    const v = generateVariations("Bœuf à la mode", "tv", frenchPack);
    expect(v).toContain("Boeuf a la mode");
  });

  it("strips French articles when only French is enabled", () => {
    const v = generateVariations("Le Grand Voyage", "tv", frenchPack);
    // The article-stripping pass should remove the leading "Le ".
    expect(v).toContain("Grand Voyage");
  });

  it("preserves case when stripping uppercase accented letters", () => {
    const v = generateVariations("ÉTÉ", "tv", frenchPack);
    expect(v).toContain("ETE");
  });

  it("does not strip German articles when only French is enabled", () => {
    const v = generateVariations("Die Hütte", "tv", frenchPack);
    expect(v.every((x) => x.toLowerCase().startsWith("die"))).toBe(true);
  });
});

describe("french-accents: ligature-only variant", () => {
  it("Cœur → keeps accents but still expands ligature", () => {
    // Apostrophes are stripped by the variation pipeline (special-char pass),
    // so we test ligature expansion against an apostrophe-free title.
    const v = generateVariations("Cœur Mémoire", "tv", frenchPack);
    // Ligatures-only map keeps é but rewrites œ.
    expect(v).toContain("Coeur Mémoire");
  });
});
