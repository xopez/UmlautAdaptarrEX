import {buildXml, ensureArray, parseXml} from "./parse";

interface ChannelTree {
    rss?: {
        channel?: {
            item?: unknown | unknown[];
            [key: string]: unknown;
        };
        [key: string]: unknown;
    };
}

function itemKey(item: Record<string, unknown>): string {
    const guid =
        item.guid &&
        typeof item.guid === "object" &&
        "#text" in (item.guid as Record<string, unknown>)
            ? (item.guid as Record<string, unknown>)["#text"]
            : item.guid;
    if (typeof guid === "string" && guid) return `guid:${guid}`;
    if (typeof item.link === "string") return `link:${item.link}`;
    if (typeof item.title === "string") return `title:${item.title}`;
    return JSON.stringify(item).slice(0, 500);
}

export function aggregateIndexerResponses(xmls: string[]): string {
    if (xmls.length === 0) return "<rss><channel></channel></rss>";
    const parsed = xmls.map((xml) => parseXml(xml) as ChannelTree);

    const baseTree = parsed[0]!;
    if (!baseTree?.rss?.channel) return xmls[0]!;

    const seen = new Set<string>();
    const mergedItems: Record<string, unknown>[] = [];

    for (const tree of parsed) {
        const items = ensureArray(tree?.rss?.channel?.item) as Record<
            string,
            unknown
        >[];
        for (const item of items) {
            const key = itemKey(item);
            if (seen.has(key)) continue;
            seen.add(key);
            mergedItems.push(item);
        }
    }

    baseTree.rss!.channel!.item = mergedItems;
    return buildXml(baseTree);
}
