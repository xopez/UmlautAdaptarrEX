import { describe, expect, it } from "vitest";
import {
  ArrInstanceSchema,
  ArrInstanceUpdateSchema,
  ArrTypeSchema,
  ProviderIdSchema,
  ProviderOrderSchema,
  TestConnectionSchema,
} from "@/schemas/instance";

describe("ArrTypeSchema", () => {
  it.each(["sonarr", "radarr", "lidarr", "readarr"])("accepts %s", (type) => {
    expect(ArrTypeSchema.safeParse(type).success).toBe(true);
  });

  it("rejects unknown types", () => {
    expect(ArrTypeSchema.safeParse("sonarr_v2").success).toBe(false);
  });
});

describe("ProviderIdSchema", () => {
  it.each(["pcjones", "tvdb", "tmdb"])("accepts %s", (id) => {
    expect(ProviderIdSchema.safeParse(id).success).toBe(true);
  });
});

describe("ProviderOrderSchema", () => {
  it("accepts a 1 to 3 element ordered list", () => {
    expect(ProviderOrderSchema.safeParse(["pcjones"]).success).toBe(true);
    expect(ProviderOrderSchema.safeParse(["pcjones", "tvdb"]).success).toBe(
      true,
    );
    expect(
      ProviderOrderSchema.safeParse(["pcjones", "tvdb", "tmdb"]).success,
    ).toBe(true);
  });

  it("rejects an empty list", () => {
    expect(ProviderOrderSchema.safeParse([]).success).toBe(false);
  });

  it("rejects duplicates", () => {
    expect(ProviderOrderSchema.safeParse(["pcjones", "pcjones"]).success).toBe(
      false,
    );
  });

  it("rejects unknown ids", () => {
    expect(ProviderOrderSchema.safeParse(["bogus"]).success).toBe(false);
  });
});

describe("ArrInstanceSchema", () => {
  const baseSonarr = {
    type: "sonarr" as const,
    name: "Living Room",
    host: "http://sonarr.local",
    apiKey: "1234567890abcdef",
    enabled: true,
    providerOrder: ["pcjones", "tvdb"] as const,
  };

  it("accepts a valid Sonarr config", () => {
    expect(ArrInstanceSchema.safeParse(baseSonarr).success).toBe(true);
  });

  it("requires providerOrder for sonarr/radarr", () => {
    const r = ArrInstanceSchema.safeParse({
      ...baseSonarr,
      providerOrder: null,
    });
    expect(r.success).toBe(false);
  });

  it("permits null providerOrder for lidarr/readarr", () => {
    expect(
      ArrInstanceSchema.safeParse({
        ...baseSonarr,
        type: "lidarr",
        providerOrder: null,
      }).success,
    ).toBe(true);
    expect(
      ArrInstanceSchema.safeParse({
        ...baseSonarr,
        type: "readarr",
        providerOrder: null,
      }).success,
    ).toBe(true);
  });

  it("rejects hosts that are not http/https", () => {
    expect(
      ArrInstanceSchema.safeParse({
        ...baseSonarr,
        host: "ftp://example.com",
      }).success,
    ).toBe(false);
  });

  it("rejects too-short api keys", () => {
    expect(
      ArrInstanceSchema.safeParse({ ...baseSonarr, apiKey: "short" }).success,
    ).toBe(false);
  });

  it("defaults enabled=true and providerOrder=null when omitted", () => {
    const r = ArrInstanceSchema.safeParse({
      type: "lidarr",
      name: "Music",
      host: "http://lidarr.local",
      apiKey: "key-12345",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.enabled).toBe(true);
      expect(r.data.providerOrder).toBeNull();
    }
  });
});

describe("ArrInstanceUpdateSchema", () => {
  it("requires only the id; everything else is optional", () => {
    expect(ArrInstanceUpdateSchema.safeParse({ id: "abc" }).success).toBe(true);
  });

  it("rejects updates without an id", () => {
    expect(ArrInstanceUpdateSchema.safeParse({ name: "x" }).success).toBe(
      false,
    );
  });

  it("validates a partial host change", () => {
    expect(
      ArrInstanceUpdateSchema.safeParse({
        id: "abc",
        host: "javascript:evil",
      }).success,
    ).toBe(false);
    expect(
      ArrInstanceUpdateSchema.safeParse({
        id: "abc",
        host: "https://new.host",
      }).success,
    ).toBe(true);
  });
});

describe("TestConnectionSchema", () => {
  it("accepts a minimal payload", () => {
    expect(
      TestConnectionSchema.safeParse({
        type: "sonarr",
        host: "http://sonarr.local",
        apiKey: "k",
      }).success,
    ).toBe(true);
  });
});
