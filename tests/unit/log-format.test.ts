import { describe, expect, it } from "vitest";
import {
  formatTimestamp,
  parseContext,
} from "@/app/(admin)/logs/_lib/log-format";

describe("formatTimestamp", () => {
  it("formats a UTC ISO string in local time with zero-padded fields", () => {
    // Construct a deterministic local-time date so the test passes regardless
    // of the runner's timezone.
    const d = new Date(2026, 0, 5, 7, 8, 9); // 2026-01-05 07:08:09 local
    const result = formatTimestamp(d.toISOString());
    expect(result).toBe("2026-01-05 07:08:09");
  });

  it("zero-pads single-digit components", () => {
    const d = new Date(2026, 8, 3, 4, 5, 6); // 2026-09-03 04:05:06 local
    expect(formatTimestamp(d.toISOString())).toBe("2026-09-03 04:05:06");
  });
});

describe("parseContext", () => {
  it("returns an empty array for null or empty input", () => {
    expect(parseContext(null)).toEqual([]);
    expect(parseContext("")).toEqual([]);
  });

  it("returns an empty array for invalid JSON", () => {
    expect(parseContext("not json")).toEqual([]);
  });

  it("returns an empty array for non-object JSON", () => {
    // strings/booleans/numbers are not objects, arrays however are iterated
    // by Object.entries so they fall through to the formatter.
    expect(parseContext('"string"')).toEqual([]);
    expect(parseContext("42")).toEqual([]);
    expect(parseContext("true")).toEqual([]);
  });

  it("filters pid and reqId noise", () => {
    const ctx = parseContext(
      JSON.stringify({ pid: 42, reqId: "req-1", host: "example.com" }),
    );
    expect(ctx).toEqual([["host", "example.com"]]);
  });

  it("stringifies numbers, booleans, and null", () => {
    const ctx = parseContext(JSON.stringify({ count: 7, ok: true, err: null }));
    expect(ctx).toEqual([
      ["count", "7"],
      ["ok", "true"],
      ["err", "null"],
    ]);
  });

  it("JSON-encodes nested objects and arrays", () => {
    const ctx = parseContext(
      JSON.stringify({ list: [1, 2], nested: { a: 1 } }),
    );
    expect(ctx).toEqual([
      ["list", "[1,2]"],
      ["nested", '{"a":1}'],
    ]);
  });

  it("truncates long values with an ellipsis at 117 chars", () => {
    const long = "x".repeat(200);
    const ctx = parseContext(JSON.stringify({ long }));
    expect(ctx).toHaveLength(1);
    const [key, value] = ctx[0]!;
    expect(key).toBe("long");
    expect(value).toHaveLength(118); // 117 + "…"
    expect(value.endsWith("…")).toBe(true);
  });

  it("preserves order of insertion", () => {
    const ctx = parseContext(JSON.stringify({ b: "B", a: "A", c: "C" }));
    expect(ctx.map(([k]) => k)).toEqual(["b", "a", "c"]);
  });
});
