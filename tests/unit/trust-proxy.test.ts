import { describe, expect, it } from "vitest";
import { parseTrustProxy } from "@/server/trust-proxy";

describe("parseTrustProxy", () => {
  it("defaults to 'loopback' when the env var is unset", () => {
    expect(parseTrustProxy(undefined)).toBe("loopback");
  });

  it("returns false for an empty string or 'false'", () => {
    expect(parseTrustProxy("")).toBe(false);
    expect(parseTrustProxy("   ")).toBe(false);
    expect(parseTrustProxy("false")).toBe(false);
  });

  it("returns true for 'true'", () => {
    expect(parseTrustProxy("true")).toBe(true);
  });

  it("returns a number for an integer string", () => {
    expect(parseTrustProxy("1")).toBe(1);
    expect(parseTrustProxy("3")).toBe(3);
  });

  it("returns a trimmed string array for a comma-separated list", () => {
    expect(parseTrustProxy("127.0.0.1, ::1, 10.0.0.0/8")).toEqual([
      "127.0.0.1",
      "::1",
      "10.0.0.0/8",
    ]);
  });

  it("returns the verbatim string for unrecognised values", () => {
    expect(parseTrustProxy("uniquelocal")).toBe("uniquelocal");
    expect(parseTrustProxy("127.0.0.1")).toBe("127.0.0.1");
  });

  it("trims whitespace from the input", () => {
    expect(parseTrustProxy("  loopback  ")).toBe("loopback");
  });
});
