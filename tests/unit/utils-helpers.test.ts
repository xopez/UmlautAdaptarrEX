import { describe, expect, it } from "vitest";
import { cn, stripUndefined } from "@/lib/utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("filters falsy values", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });

  it("merges conflicting tailwind classes preferring the last one", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });

  it("respects conditional objects", () => {
    expect(cn("base", { active: true, disabled: false })).toBe("base active");
  });
});

describe("stripUndefined", () => {
  it("removes keys whose value is undefined", () => {
    const out = stripUndefined({ a: 1, b: undefined, c: "x" });
    expect(out).toEqual({ a: 1, c: "x" });
    expect("b" in out).toBe(false);
  });

  it("keeps null, false, 0, and empty string", () => {
    const out = stripUndefined({ n: null, f: false, z: 0, s: "" });
    expect(out).toEqual({ n: null, f: false, z: 0, s: "" });
  });

  it("returns an empty object for an all-undefined input", () => {
    expect(stripUndefined({ a: undefined, b: undefined })).toEqual({});
  });

  it("does not mutate the input", () => {
    const input = { a: 1, b: undefined };
    stripUndefined(input);
    expect(input).toEqual({ a: 1, b: undefined });
  });
});
