import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_INFO,
  SUPPORTED_LOCALES,
  isSupportedLocale,
} from "@/lib/i18n-config";

describe("isSupportedLocale", () => {
  it.each(["en", "de", "sv", "fr"])(
    "accepts the supported locale %s",
    (locale) => {
      expect(isSupportedLocale(locale)).toBe(true);
    },
  );

  it("rejects unknown locales", () => {
    expect(isSupportedLocale("xx")).toBe(false);
    expect(isSupportedLocale("EN")).toBe(false);
    expect(isSupportedLocale("en-US")).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isSupportedLocale(undefined)).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isSupportedLocale("")).toBe(false);
  });
});

describe("locale constants", () => {
  it("has DEFAULT_LOCALE inside SUPPORTED_LOCALES", () => {
    expect(SUPPORTED_LOCALES).toContain(DEFAULT_LOCALE);
  });

  it("provides label and flag for every supported locale", () => {
    for (const loc of SUPPORTED_LOCALES) {
      const info = LOCALE_INFO[loc];
      expect(info.label.length).toBeGreaterThan(0);
      expect(info.flag.length).toBeGreaterThan(0);
    }
  });

  it("uses a stable cookie name", () => {
    expect(LOCALE_COOKIE).toBe("ua-locale");
  });
});
