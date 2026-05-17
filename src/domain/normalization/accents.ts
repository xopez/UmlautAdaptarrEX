import {getActiveLanguagePack, type LanguagePack} from "../plugins";

// Matches any codepoint outside basic ASCII (≥ 0x80). Pure-ASCII inputs can't
// contain combining marks, so we can skip the NFD round-trip altogether.
const NON_ASCII_RE = /[-￿]/;
const COMBINING_RE = /[̀-ͯ]/g;

export function removeAccent(input: string): string {
    if (!NON_ASCII_RE.test(input)) return input;
    return input.normalize("NFD").replace(COMBINING_RE, "");
}

/**
 * NFD-strip diacritics, but keep the combining marks that compose the
 * `wordChars` of the active language pack. E.g. with German enabled the
 * combining diaeresis (U+0308) is kept so `Bär` survives. With Swedish
 * enabled additionally, the combining ring above (U+030A) is kept so
 * `Ångström` keeps Å.
 *
 * Hot path: pure-ASCII inputs (the steady state for release titles) bypass
 * NFD entirely.
 */
export function removeAccentButKeepDiacritics(
    input: string,
    pack: LanguagePack = getActiveLanguagePack(),
): string {
    if (!NON_ASCII_RE.test(input)) return input;
    const keep = pack.combiningMarksToKeep;
    return input
        .normalize("NFD")
        .replace(COMBINING_RE, (m) => (keep.has(m) ? m : ""))
        .normalize("NFC");
}
