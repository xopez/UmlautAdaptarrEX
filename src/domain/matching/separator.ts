const SEPARATOR_RE = /[._ ]/;
const ANY_SEPARATOR_GLOBAL = /[._ ]/g;

export function findFirstSeparator(title: string): string {
    const match = SEPARATOR_RE.exec(title);
    return match ? match[0] : " ";
}

export function replaceSeparatorsWithSpace(title: string): string {
    return title.replace(ANY_SEPARATOR_GLOBAL, " ");
}

export function escapeRegex(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
