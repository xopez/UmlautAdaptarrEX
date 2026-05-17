import { describe, expect, it } from "vitest";
import {
  InstallProxySchema,
  ProwlarrCredsSchema,
  ProwlarrImportSchema,
} from "@/schemas/prowlarr";

describe("ProwlarrCredsSchema", () => {
  it("accepts http and https hosts", () => {
    expect(
      ProwlarrCredsSchema.safeParse({
        host: "http://prowlarr.local",
        apiKey: "1234567890",
      }).success,
    ).toBe(true);
    expect(
      ProwlarrCredsSchema.safeParse({
        host: "https://prowlarr.local",
        apiKey: "1234567890",
      }).success,
    ).toBe(true);
  });

  it("rejects non-http schemes", () => {
    expect(
      ProwlarrCredsSchema.safeParse({
        host: "ftp://prowlarr.local",
        apiKey: "1234567890",
      }).success,
    ).toBe(false);
  });

  it("rejects api keys that are too short", () => {
    expect(
      ProwlarrCredsSchema.safeParse({
        host: "http://prowlarr.local",
        apiKey: "short",
      }).success,
    ).toBe(false);
  });
});

describe("ProwlarrImportSchema", () => {
  it("requires at least one selection", () => {
    expect(ProwlarrImportSchema.safeParse({ selections: [] }).success).toBe(
      false,
    );
  });

  it("validates each selection as an ArrInstance", () => {
    const r = ProwlarrImportSchema.safeParse({
      selections: [
        {
          type: "sonarr",
          name: "Living Room",
          host: "http://sonarr.local",
          apiKey: "key-1234567",
          enabled: true,
          providerOrder: ["pcjones"],
        },
      ],
    });
    expect(r.success).toBe(true);
  });
});

describe("InstallProxySchema", () => {
  it("trims and accepts a non-empty host", () => {
    const r = InstallProxySchema.safeParse({ host: "  prowlarr.local  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.host).toBe("prowlarr.local");
  });

  it("rejects an empty host", () => {
    expect(InstallProxySchema.safeParse({ host: "" }).success).toBe(false);
    expect(InstallProxySchema.safeParse({ host: "   " }).success).toBe(false);
  });

  it("rejects hosts longer than 255 chars", () => {
    expect(
      InstallProxySchema.safeParse({ host: "x".repeat(256) }).success,
    ).toBe(false);
  });
});
