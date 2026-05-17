import { describe, expect, it } from "vitest";
import { AppState, type CachedSearchItem, getAppState } from "@/server/state";

function makeItem(overrides: Partial<CachedSearchItem> = {}): CachedSearchItem {
  return {
    id: "x",
    arrInstanceId: "inst-1",
    arrId: 1,
    externalId: "100",
    title: "Realm of Ravens",
    expectedTitle: "Realm of Ravens",
    expectedAuthor: null,
    germanTitle: "Lied der Schwarzen Raben",
    mediaType: "tv",
    year: null,
    titleSearchVariations: [],
    titleMatchVariations: ["Realm of Ravens", "Lied der Schwarzen Raben"],
    authorMatchVariations: [],
    ...overrides,
  };
}

describe("AppState in-memory item index", () => {
  it("indexes a fresh item by external id", () => {
    const state = new AppState();
    state.indexItem(makeItem());
    expect(state.getByExternalId("tv", "100")?.title).toBe("Realm of Ravens");
  });

  it("returns null when the external id is unknown", () => {
    const state = new AppState();
    expect(state.getByExternalId("tv", "missing")).toBeNull();
  });

  it("namespaces by media type", () => {
    const state = new AppState();
    state.indexItem(makeItem({ mediaType: "tv", externalId: "1" }));
    state.indexItem(
      makeItem({ mediaType: "movie", externalId: "1", title: "Movie One" }),
    );
    expect(state.getByExternalId("tv", "1")?.title).toBe("Realm of Ravens");
    expect(state.getByExternalId("movie", "1")?.title).toBe("Movie One");
  });

  it("findByTitle returns the longest matching variation", () => {
    const state = new AppState();
    state.indexItem(
      makeItem({
        externalId: "1",
        titleMatchVariations: ["Realm of Ravens"],
      }),
    );
    const result = state.findByTitle("tv", "Realm of Ravens S01E01 Pilot");
    expect(result?.externalId).toBe("1");
  });

  it("findByTitle returns null when nothing matches", () => {
    const state = new AppState();
    state.indexItem(makeItem());
    expect(state.findByTitle("tv", "Totally unrelated release")).toBeNull();
  });

  it("removeItemsForInstance drops items by arrInstanceId", () => {
    const state = new AppState();
    state.indexItem(
      makeItem({
        arrInstanceId: "inst-1",
        externalId: "1",
      }),
    );
    state.indexItem(
      makeItem({
        arrInstanceId: "inst-2",
        externalId: "2",
        title: "Other",
        titleMatchVariations: ["Other"],
      }),
    );
    state.removeItemsForInstance("inst-1");
    expect(state.getByExternalId("tv", "1")).toBeNull();
    expect(state.getByExternalId("tv", "2")).not.toBeNull();
  });

  it("toRewriteSearchItem extracts the rewrite-relevant fields", () => {
    const state = new AppState();
    const item = makeItem({
      expectedAuthor: "Author X",
      titleMatchVariations: ["A", "B"],
      authorMatchVariations: ["Author X"],
    });
    const rewrite = state.toRewriteSearchItem(item);
    expect(rewrite).toEqual({
      expectedTitle: item.expectedTitle,
      expectedAuthor: "Author X",
      titleMatchVariations: ["A", "B"],
      authorMatchVariations: ["Author X"],
      mediaType: "tv",
      year: null,
      // Default per-instance options (year-matching on, +/-1 tolerance) are
      // applied even for items whose owning instance hasn't been registered
      // in AppState yet, mirroring the permissive default behaviour.
      yearMatchingTolerance: 1,
    });
  });
});

describe("getAppState singleton", () => {
  it("returns the same instance on repeated calls", () => {
    expect(getAppState()).toBe(getAppState());
  });
});
