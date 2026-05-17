import { describe, expect, it } from "vitest";
import { isProwlarrConfigured } from "@/lib/setting-helpers";

describe("isProwlarrConfigured", () => {
  it("is true when both host and api key are set", () => {
    expect(
      isProwlarrConfigured({
        prowlarrHost: "http://prowlarr.local",
        prowlarrApiKey: "abc",
        // Other Setting fields are not relevant for this check.
      } as Parameters<typeof isProwlarrConfigured>[0]),
    ).toBe(true);
  });

  it("is false when host is missing", () => {
    expect(
      isProwlarrConfigured({
        prowlarrHost: null,
        prowlarrApiKey: "abc",
      } as Parameters<typeof isProwlarrConfigured>[0]),
    ).toBe(false);
  });

  it("is false when api key is missing", () => {
    expect(
      isProwlarrConfigured({
        prowlarrHost: "http://prowlarr.local",
        prowlarrApiKey: null,
      } as Parameters<typeof isProwlarrConfigured>[0]),
    ).toBe(false);
  });

  it("is false when both are empty strings", () => {
    expect(
      isProwlarrConfigured({
        prowlarrHost: "",
        prowlarrApiKey: "",
      } as Parameters<typeof isProwlarrConfigured>[0]),
    ).toBe(false);
  });

  it("is false for null setting", () => {
    expect(isProwlarrConfigured(null)).toBe(false);
  });
});
