export * from "./accents";
export * from "./clean";
export * from "./comparison";

import {escapeRegex} from "../matching/separator";
import {getActiveLanguagePack, type LanguagePack} from "../plugins";
import {removeAccentButKeepDiacritics} from "./accents";

/**
 * Strip a leading article (`The|Der|Die|Das|...`) — case-insensitive — using
 * the active language pack's article list. Falls back to a sensible default
 * if no plugin contributes articles, so utility callers (e.g. Lidarr title
 * normalization) still strip `The/An/A`.
 */
export function stripLeadingArticle(
    input: string,
    pack: LanguagePack = getActiveLanguagePack(),
): string {
    const articles =
        pack.articles.length > 0 ? pack.articles : ["the", "an", "a"];
    const re = new RegExp(`^(${articles.map(escapeRegex).join("|")})\\s+`, "i");
    return input.replace(re, "");
}

export function getLidarrTitleForExternalId(
    title: string,
    pack: LanguagePack = getActiveLanguagePack(),
): string {
    return removeAccentButKeepDiacritics(
        stripLeadingArticle(title, pack),
        pack,
    ).trim();
}

export function getReadarrTitleForExternalId(
    title: string,
    pack: LanguagePack = getActiveLanguagePack(),
): string {
    const noArticle = title.replace(/^the\s+/i, "");
    const sepReplaced = noArticle.replace(/[.\-:]/g, " ").replace(/\s+/g, " ");
    return removeAccentButKeepDiacritics(sepReplaced, pack).trim();
}
