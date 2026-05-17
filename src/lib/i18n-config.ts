export const SUPPORTED_LOCALES = ["en", "de", "sv", "fr"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "ua-locale";

export const LOCALE_INFO: Record<Locale, { label: string; flag: string }> = {
  en: { label: "English", flag: "🇺🇸" },
  de: { label: "Deutsch", flag: "🇩🇪" },
  sv: { label: "Svenska", flag: "🇸🇪" },
  fr: { label: "Français", flag: "🇫🇷" },
};

export function isSupportedLocale(value: string | undefined): value is Locale {
  return (
    value !== undefined &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}
