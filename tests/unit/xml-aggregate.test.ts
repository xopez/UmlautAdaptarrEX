import { describe, expect, it } from "vitest";
import { aggregateIndexerResponses } from "@/domain/xml/aggregate.js";

const wrap = (items: string) =>
  `<?xml version="1.0" encoding="UTF-8"?><rss><channel><title>Idx</title>${items}</channel></rss>`;

describe("aggregateIndexerResponses", () => {
  it("returns an empty <rss><channel></channel></rss> when given no inputs", () => {
    expect(aggregateIndexerResponses([])).toBe(
      "<rss><channel></channel></rss>",
    );
  });

  it("returns the input unchanged when it has no rss/channel structure", () => {
    const malformed = `<not-rss><foo>1</foo></not-rss>`;
    expect(aggregateIndexerResponses([malformed])).toBe(malformed);
  });

  it("merges items from multiple feeds", () => {
    const a = wrap(`<item><guid>a</guid><title>A</title></item>`);
    const b = wrap(`<item><guid>b</guid><title>B</title></item>`);
    const merged = aggregateIndexerResponses([a, b]);
    expect(merged).toContain("<guid>a</guid>");
    expect(merged).toContain("<guid>b</guid>");
  });

  it("de-duplicates items by guid across feeds", () => {
    const item = `<item><guid>same</guid><title>Same</title></item>`;
    const merged = aggregateIndexerResponses([wrap(item), wrap(item)]);
    const occurrences = merged.match(/<guid>same<\/guid>/g) ?? [];
    expect(occurrences).toHaveLength(1);
  });

  it("respects guid #text wrapping (e.g. isPermaLink attribute) when de-duplicating", () => {
    const item = `<item><guid isPermaLink="true">perma-1</guid><title>X</title></item>`;
    const merged = aggregateIndexerResponses([wrap(item), wrap(item)]);
    const occurrences = merged.match(/perma-1/g) ?? [];
    expect(occurrences).toHaveLength(1);
  });

  it("falls back to link when guid is missing", () => {
    const a = wrap(`<item><link>http://x/1</link><title>X</title></item>`);
    const b = wrap(`<item><link>http://x/1</link><title>X</title></item>`);
    const merged = aggregateIndexerResponses([a, b]);
    const occurrences = merged.match(/http:\/\/x\/1/g) ?? [];
    expect(occurrences).toHaveLength(1);
  });

  it("falls back to title when guid and link are missing", () => {
    const a = wrap(`<item><title>OnlyTitle</title></item>`);
    const b = wrap(`<item><title>OnlyTitle</title></item>`);
    const merged = aggregateIndexerResponses([a, b]);
    const occurrences = merged.match(/<title>OnlyTitle<\/title>/g) ?? [];
    expect(occurrences).toHaveLength(1);
  });

  it("preserves channel-level metadata from the first feed", () => {
    const a = wrap(`<item><guid>a</guid></item>`);
    const b = wrap(`<item><guid>b</guid></item>`);
    const merged = aggregateIndexerResponses([a, b]);
    expect(merged).toContain("<title>Idx</title>");
  });
});
