import { describe, expect, it } from "vitest";
import { aggregatePlugins } from "@/domain/plugins/aggregate.js";
import { germanUmlauts } from "@/domain/plugins/german-umlauts/index.js";
import { generateVariations } from "@/domain/variations/generate.js";

const germanPack = aggregatePlugins([germanUmlauts]);

// These cases mirror the legacy behavior of UmlautAdaptarrEX 1.x and ensure
// the plugin migration didn't change the wire output.
describe("german-umlauts plugin (regression vs 1.x)", () => {
  it("Bärenflüstern → original + Latin + dots variants", () => {
    const v = generateVariations("Bärenflüstern", "tv", germanPack);
    expect(v).toContain("Bärenflüstern");
    expect(v).toContain("Baerenfluestern");
    expect(v).toContain("Barenflustern");
  });

  it("Strips Der/Die/Das recursively", () => {
    const v = generateVariations("Die Hütte", "tv", germanPack);
    expect(v).toContain("Die Hütte");
    expect(v).toContain("Hütte");
    expect(v).toContain("Huette");
    expect(v).toContain("Hutte");
  });

  it("Strips English The/An/A as well", () => {
    const v = generateVariations("The Path", "tv", germanPack);
    expect(v).toContain("The Path");
    expect(v).toContain("Path");
  });

  it("Audio mode adds the strip-all variant (Bär müde → Br mde)", () => {
    const v = generateVariations("Bär müde", "audio", germanPack);
    expect(v).toContain("Br mde");
  });

  it("ß is folded to ss in both Latin and dots maps", () => {
    const v = generateVariations("Straße", "tv", germanPack);
    expect(v).toContain("Strasse");
  });
});
