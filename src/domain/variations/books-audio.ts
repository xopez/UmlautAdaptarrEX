import {removeExtraWhitespaces} from "../normalization/clean";
import {getActiveLanguagePack, type LanguagePack} from "../plugins";
import {generateVariations, type MediaType} from "./generate";

export interface BooksAudioVariationInput {
    expectedTitle: string;
    expectedAuthor: string;
    mediaType: Extract<MediaType, "audio" | "book">;
}

export interface BooksAudioVariationOutput {
    titleSearchVariations: string[];
    titleMatchVariations: string[];
    authorMatchVariations: string[];
}

export function generateForBooksAndAudio(
    input: BooksAudioVariationInput,
    pack: LanguagePack = getActiveLanguagePack(),
): BooksAudioVariationOutput {
    const {expectedTitle, expectedAuthor, mediaType} = input;

    let titleMatch: string[];
    if (expectedTitle.includes(expectedAuthor)) {
        const stripped = removeExtraWhitespaces(
            expectedTitle.replace(expectedAuthor, ""),
        );
        titleMatch = generateVariations(stripped, mediaType, pack);
    } else {
        titleMatch = generateVariations(expectedTitle, mediaType, pack);
    }

    const titleSearch = generateVariations(
        `${expectedAuthor} ${expectedTitle}`,
        mediaType,
        pack,
    );
    let authorMatch = generateVariations(expectedAuthor, mediaType, pack);

    if (mediaType === "book" && expectedAuthor.includes(" ")) {
        const parts = expectedAuthor.split(/\s+/).filter(Boolean);
        const lastName = parts[parts.length - 1]!;
        const firstNames = parts.slice(0, -1).join(" ");
        const alt = `${lastName}, ${firstNames}`;
        authorMatch = [...authorMatch, ...generateVariations(alt, mediaType, pack)];
    }

    return {
        titleSearchVariations: titleSearch,
        titleMatchVariations: titleMatch,
        authorMatchVariations: Array.from(new Set(authorMatch)),
    };
}
