import { describe, expect, it } from "vitest";
import { probeTmdbKey } from "@/providers/tmdb.js";

describe("probeTmdbKey (pre-network validation)", () => {
  it("returns code='missing' for empty string", async () => {
    expect(await probeTmdbKey("")).toEqual({ ok: false, code: "missing" });
  });

  it("returns code='v4_token' for JWT-shaped tokens", async () => {
    const r = await probeTmdbKey(
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.signaturepart",
    );
    expect(r).toEqual({ ok: false, code: "v4_token" });
  });

  it("returns code='invalid_format' for keys that are too short to be real", async () => {
    expect(await probeTmdbKey("abc123")).toEqual({
      ok: false,
      code: "invalid_format",
    });
  });
});
