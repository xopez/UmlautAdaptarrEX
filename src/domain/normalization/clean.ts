import {getActiveLanguagePack, type LanguagePack} from "../plugins";
import {removeAccentButKeepDiacritics} from "./accents";

const SPECIAL_NO_DIACRITICS = /[^a-zA-Z0-9 \-]+/g;
const MULTI_WS = / {2,}/g;
const DOTS_OR_COLONS = /[.:]/;

/**
 * Strip everything that isn't alphanumeric / space / dash. When
 * `keepDiacritics` is true, the active language pack's `wordChars` are
 * additionally preserved so plugin-handled diacritics survive.
 *
 * Reuses the precompiled regex on the pack so we don't rebuild a regex
 * per call (this runs in the hot path of `getCleanTitle`).
 */
export function removeSpecialCharacters(
    input: string,
    keepDiacritics = true,
    pack: LanguagePack = getActiveLanguagePack(),
): string {
    if (!keepDiacritics) {
        return input.replace(SPECIAL_NO_DIACRITICS, "");
    }
    return input.replace(pack.specialCharsKeepRegex, "");
}

export function removeExtraWhitespaces(input: string): string {
    return input.replace(MULTI_WS, " ").trim();
}

export function getCleanTitle(
    input: string,
    pack: LanguagePack = getActiveLanguagePack(),
): string {
    // Fast path: skip the dot/colon replace if neither is present.
    const replaced = DOTS_OR_COLONS.test(input)
        ? input.replace(/\./g, " ").replace(/:/g, " ")
        : input;
    const stripped = removeAccentButKeepDiacritics(replaced, pack);
    const cleaned = stripped.replace(pack.specialCharsKeepRegex, "");
    return removeExtraWhitespaces(cleaned);
}
