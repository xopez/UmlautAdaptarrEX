import {XMLBuilder, XMLParser} from "fast-xml-parser";

// Indexer responses commonly wrap titles/descriptions in CDATA. Capturing
// them under `__cdata` lets us preserve them on roundtrip. trimValues drops
// inter-element whitespace text nodes that would otherwise leak through.
export const CDATA_KEY = "__cdata";

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    allowBooleanAttributes: true,
    preserveOrder: false,
    trimValues: true,
    parseTagValue: false,
    parseAttributeValue: false,
    textNodeName: "#text",
    cdataPropName: CDATA_KEY,
});

const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    format: false,
    textNodeName: "#text",
    suppressEmptyNode: false,
    // Default is true: any attribute whose value is "true" is emitted as a bare
    // attribute (e.g. `isPermaLink="true"` → `isPermaLink`), which is invalid
    // XML. Sonarr/Radarr's strict XML parser rejects such feeds and reports an
    // empty search result. Real Newznab/Torznab responses commonly use
    // `<guid isPermaLink="true">…</guid>`.
    suppressBooleanAttributes: false,
    cdataPropName: CDATA_KEY,
});

export function parseXml(xml: string): unknown {
    return parser.parse(xml);
}

export function buildXml(obj: unknown): string {
    return builder.build(obj);
}

// fast-xml-parser collapses single-element arrays to a bare object; force array shape.
export function ensureArray<T>(value: T | T[] | undefined): T[] {
    if (value === undefined) return [];
    return Array.isArray(value) ? value : [value];
}
