import { afterEach, describe, expect, it } from "vitest";
import { aggregatePlugins } from "@/domain/plugins/aggregate.js";
import {
  getActiveLanguagePack,
  setActiveLanguagePack,
} from "@/domain/plugins/active.js";
import { BUILTIN_PLUGINS, getPlugin } from "@/domain/plugins/registry.js";

describe("BUILTIN_PLUGINS registry", () => {
  it("registers german, swedish, and french plugins in stable order", () => {
    const ids = BUILTIN_PLUGINS.map((p) => p.id);
    expect(ids).toEqual([
      "german-umlauts",
      "swedish-umlauts",
      "french-accents",
    ]);
  });

  it("each plugin exposes non-empty id and i18n keys", () => {
    for (const plugin of BUILTIN_PLUGINS) {
      expect(plugin.id.length).toBeGreaterThan(0);
      expect(plugin.nameKey.length).toBeGreaterThan(0);
      expect(plugin.descriptionKey.length).toBeGreaterThan(0);
    }
  });
});

describe("getPlugin", () => {
  it("returns the registered plugin for a known id", () => {
    const plugin = getPlugin("german-umlauts");
    expect(plugin).toBeDefined();
    expect(plugin?.id).toBe("german-umlauts");
  });

  it("returns undefined for an unknown id", () => {
    expect(getPlugin("klingon")).toBeUndefined();
  });
});

describe("active language pack", () => {
  const original = getActiveLanguagePack();

  afterEach(() => {
    setActiveLanguagePack(original);
  });

  it("defaults to the aggregate of plugins with defaultEnabled=true", () => {
    const expected = aggregatePlugins(
      BUILTIN_PLUGINS.filter((p) => p.defaultEnabled),
    );
    const active = getActiveLanguagePack();
    expect(active.hasPlugins).toBe(expected.hasPlugins);
    expect(active.variationMaps.length).toBe(expected.variationMaps.length);
    expect(active.articles).toEqual(expected.articles);
  });

  it("setActiveLanguagePack updates the returned pack", () => {
    const empty = aggregatePlugins([]);
    setActiveLanguagePack(empty);
    expect(getActiveLanguagePack().hasPlugins).toBe(false);
    expect(getActiveLanguagePack().variationMaps).toEqual([]);
  });
});
