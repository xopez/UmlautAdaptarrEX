import { describe, expect, it } from "vitest";
import {
  escapeRegex,
  findFirstSeparator,
  replaceSeparatorsWithSpace,
} from "@/domain/matching/separator.js";

describe("findFirstSeparator", () => {
  it("returns the first dot when present", () => {
    expect(findFirstSeparator("Realm.of.Ravens.S01E01")).toBe(".");
  });

  it("returns the first underscore when present", () => {
    expect(findFirstSeparator("Realm_of_Ravens")).toBe("_");
  });

  it("returns the first space when present", () => {
    expect(findFirstSeparator("Realm of Ravens")).toBe(" ");
  });

  it("returns the earliest of mixed separators", () => {
    expect(findFirstSeparator("Realm of_Ravens.S01")).toBe(" ");
    expect(findFirstSeparator("Realm.of_Ravens S01")).toBe(".");
  });

  it("falls back to space when no separator is found", () => {
    expect(findFirstSeparator("RealmofRavens")).toBe(" ");
    expect(findFirstSeparator("")).toBe(" ");
  });
});

describe("replaceSeparatorsWithSpace", () => {
  it("collapses dots, underscores, and existing spaces to spaces", () => {
    expect(replaceSeparatorsWithSpace("Realm.of_Ravens S01")).toBe(
      "Realm of Ravens S01",
    );
  });

  it("leaves strings without separators unchanged", () => {
    expect(replaceSeparatorsWithSpace("RealmofRavens")).toBe("RealmofRavens");
  });

  it("returns empty string for empty input", () => {
    expect(replaceSeparatorsWithSpace("")).toBe("");
  });
});

describe("escapeRegex", () => {
  it("escapes all regex metacharacters", () => {
    expect(escapeRegex(".*+?^${}()|[]\\")).toBe(
      "\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\",
    );
  });

  it("leaves alphanumerics untouched", () => {
    expect(escapeRegex("Hello123")).toBe("Hello123");
  });

  it("produces a string usable inside a RegExp", () => {
    const literal = "a.b+c";
    const re = new RegExp(escapeRegex(literal));
    expect(re.test(literal)).toBe(true);
    expect(re.test("aXbYc")).toBe(false);
  });
});
