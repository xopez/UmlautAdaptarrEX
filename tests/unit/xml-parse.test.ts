import { describe, expect, it } from "vitest";
import {
  buildXml,
  CDATA_KEY,
  ensureArray,
  parseXml,
} from "@/domain/xml/parse.js";

describe("CDATA_KEY", () => {
  it("matches the property name fast-xml-parser uses for CDATA", () => {
    expect(CDATA_KEY).toBe("__cdata");
  });
});

describe("parseXml", () => {
  it("parses attributes under the `@_` prefix", () => {
    const tree = parseXml(`<item id="42" name="x"/>`) as {
      item: { "@_id": string; "@_name": string };
    };
    expect(tree.item["@_id"]).toBe("42");
    expect(tree.item["@_name"]).toBe("x");
  });

  it("preserves CDATA payloads under __cdata", () => {
    const tree = parseXml(
      `<item><title><![CDATA[A.B & C]]></title></item>`,
    ) as { item: { title: { __cdata: string } } };
    expect(tree.item.title.__cdata).toBe("A.B & C");
  });

  it("does not coerce numeric or boolean attribute values", () => {
    const tree = parseXml(`<guid isPermaLink="true">42</guid>`) as {
      guid: { "@_isPermaLink": unknown; "#text": unknown };
    };
    expect(tree.guid["@_isPermaLink"]).toBe("true");
    expect(typeof tree.guid["@_isPermaLink"]).toBe("string");
    expect(tree.guid["#text"]).toBe("42");
    expect(typeof tree.guid["#text"]).toBe("string");
  });
});

describe("buildXml", () => {
  it("emits boolean-valued attributes verbatim (suppressBooleanAttributes=false)", () => {
    const xml = buildXml({
      guid: { "@_isPermaLink": "true", "#text": "abc" },
    });
    expect(xml).toContain('isPermaLink="true"');
    expect(xml).toContain(">abc<");
  });

  it("roundtrips a parseXml -> buildXml feed without dropping attributes", () => {
    const original = `<item id="42"><title>x</title></item>`;
    const out = buildXml(parseXml(original));
    expect(out).toContain('id="42"');
    expect(out).toContain("<title>x</title>");
  });

  it("wraps CDATA values back in CDATA blocks", () => {
    const xml = buildXml({ title: { [CDATA_KEY]: "A & B" } });
    expect(xml).toContain("<![CDATA[A & B]]>");
  });
});

describe("ensureArray", () => {
  it("returns [] for undefined", () => {
    expect(ensureArray(undefined)).toEqual([]);
  });

  it("wraps a single value in an array", () => {
    expect(ensureArray({ a: 1 })).toEqual([{ a: 1 }]);
    expect(ensureArray("x")).toEqual(["x"]);
  });

  it("returns the array unchanged when already an array", () => {
    expect(ensureArray([1, 2, 3])).toEqual([1, 2, 3]);
    expect(ensureArray([])).toEqual([]);
  });
});
