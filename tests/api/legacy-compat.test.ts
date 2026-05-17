import "./_setup/db";

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "./_setup/app";
import { cleanDb, ensureTestDb } from "./_setup/db";
import { getAppState } from "@/server/state";
import type { IndexerFetcher } from "@/server/proxy/indexer-fetcher";

let app: FastifyInstance;
const fetchMock = vi.fn();

// Duck-typed IndexerFetcher: only `.fetch(url, headers)` is called by the
// legacy handlers; we don't need the real LRU cache / rate limiter here.
const fakeFetcher = { fetch: fetchMock } as unknown as IndexerFetcher;

const TEST_API_KEY = "abcd1234567890";
const TEST_INDEXER = "indexer.example.test";

beforeAll(async () => {
  await ensureTestDb();
  await cleanDb();
  const { prisma } = await import("@/lib/db");
  await prisma.setting.create({
    data: {
      id: 1,
      appApiKey: TEST_API_KEY,
      setupComplete: true,
    },
  });
  await getAppState().reloadSettings();
  app = await buildTestApp({ legacyFetcher: fakeFetcher });
});

afterAll(async () => {
  await app.close();
  const { prisma } = await import("@/lib/db");
  await prisma.$disconnect();
});

beforeEach(() => {
  fetchMock.mockReset();
});

afterEach(async () => {
  // Reset request-history rows between tests; keep the singleton Setting row
  // so the api-key gate stays valid across tests.
  const { prisma } = await import("@/lib/db");
  await prisma.requestHistory.deleteMany({});
  await prisma.renameHistory.deleteMany({});
  await prisma.searchItem.deleteMany({});
  // Drop in-memory items so each test starts with a fresh index.
  getAppState().removeItemsForInstance("inst-1");
  getAppState().removeItemsForInstance("inst-2");
});

describe("auth gate on /:apiKey/*", () => {
  it("returns 403 'Forbidden' when the api key does not match", async () => {
    const r = await app.inject({
      method: "GET",
      url: `/wrong-key/${TEST_INDEXER}/api?t=caps`,
    });
    expect(r.statusCode).toBe(403);
    expect(r.body).toBe("Forbidden");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 400 'Invalid request' for a malformed target host", async () => {
    const r = await app.inject({
      method: "GET",
      url: `/${TEST_API_KEY}/inv lid host/api?t=caps`,
    });
    expect(r.statusCode).toBe(400);
    expect(r.body).toBe("Invalid request");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("caps proxying", () => {
  it("forwards the indexer body and content-type unchanged", async () => {
    const xml = '<?xml version="1.0"?><caps><server version="1.0" /></caps>';
    fetchMock.mockResolvedValueOnce({
      status: 200,
      contentType: "application/xml; charset=utf-8",
      body: Buffer.from(xml),
      cacheHit: false,
    });

    const r = await app.inject({
      method: "GET",
      url: `/${TEST_API_KEY}/${TEST_INDEXER}/api?t=caps`,
    });
    expect(r.statusCode).toBe(200);
    expect(r.headers["content-type"]).toBe("application/xml; charset=utf-8");
    expect(r.body).toBe(xml);

    // Fetcher saw the canonical https-prefixed URL and the user-agent header.
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, headers] = fetchMock.mock.calls[0] as [
      string,
      Record<string, string>,
    ];
    expect(url).toBe(`https://${TEST_INDEXER}/api?t=caps`);
    expect(headers).toMatchObject({ "user-agent": expect.any(String) });
  });

  it("records a RequestHistory row with cacheHit + apikey tail", async () => {
    fetchMock.mockResolvedValueOnce({
      status: 200,
      contentType: "application/xml",
      body: Buffer.from("<caps/>"),
      cacheHit: true,
    });

    await app.inject({
      method: "GET",
      url: `/${TEST_API_KEY}/${TEST_INDEXER}/api?t=caps`,
    });

    const { prisma } = await import("@/lib/db");
    const rows = await prisma.requestHistory.findMany();
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.type).toBe("caps");
    expect(row.cacheHit).toBe(true);
    expect(row.domain).toBe(TEST_INDEXER);
    // Only the last 6 chars of the api key are persisted (privacy + auditability).
    expect(row.apiKey.length).toBeLessThanOrEqual(6);
  });

  it("returns 502 'Bad gateway' when the fetcher throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("upstream timeout"));
    const r = await app.inject({
      method: "GET",
      url: `/${TEST_API_KEY}/${TEST_INDEXER}/api?t=caps`,
    });
    expect(r.statusCode).toBe(502);
    expect(r.body).toBe("Bad gateway");
  });
});

describe("search proxying", () => {
  it("forwards the indexer body for a tvsearch with no cached SearchItem", async () => {
    const xml =
      '<?xml version="1.0"?><rss><channel><item><title>Some Show S01E01</title></item></channel></rss>';
    fetchMock.mockResolvedValueOnce({
      status: 200,
      contentType: "application/xml",
      body: Buffer.from(xml),
      cacheHit: false,
    });

    const r = await app.inject({
      method: "GET",
      url: `/${TEST_API_KEY}/${TEST_INDEXER}/api?t=tvsearch&tvdbid=999999&q=Some+Show`,
    });
    expect(r.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("issues additional fetches for each title-search variation", async () => {
    // Seed an in-memory SearchItem so the route walks variations.
    getAppState().indexItem({
      id: "i1",
      arrInstanceId: "inst-1",
      arrId: 1,
      externalId: "121361",
      title: "Realm of Ravens",
      expectedTitle: "Realm of Ravens",
      expectedAuthor: null,
      germanTitle: "Lied der Schwarzen Raben",
      mediaType: "tv",
      year: null,
      titleSearchVariations: ["Lied der Schwarzen Raben"],
      titleMatchVariations: ["Realm of Ravens", "Lied der Schwarzen Raben"],
      authorMatchVariations: [],
    });

    const xml =
      '<?xml version="1.0"?><rss><channel><item><title>Item</title></item></channel></rss>';
    fetchMock.mockResolvedValue({
      status: 200,
      contentType: "application/xml",
      body: Buffer.from(xml),
      cacheHit: false,
    });

    const r = await app.inject({
      method: "GET",
      url: `/${TEST_API_KEY}/${TEST_INDEXER}/api?t=tvsearch&tvdbid=121361&q=Realm+of+Ravens`,
    });
    expect(r.statusCode).toBe(200);
    // 1 main fetch + at least one variation fetch.
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);

    // Verify variations stripped the id-params and replaced q.
    const variationCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("Lied+der"),
    );
    expect(variationCall).toBeDefined();
    expect(String(variationCall?.[0])).not.toContain("tvdbid=");
  });

  it("records a RequestHistory row with the externalId and the query", async () => {
    fetchMock.mockResolvedValueOnce({
      status: 200,
      contentType: "application/xml",
      body: Buffer.from('<?xml version="1.0"?><rss/>'),
      cacheHit: false,
    });
    await app.inject({
      method: "GET",
      url: `/${TEST_API_KEY}/${TEST_INDEXER}/api?t=tvsearch&tvdbid=121361&q=Realm+of+Ravens`,
    });
    const { prisma } = await import("@/lib/db");
    const rows = await prisma.requestHistory.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.type).toBe("tvsearch");
    expect(rows[0]?.query).toBe("Realm of Ravens");
    expect(rows[0]?.externalId).toBe("121361");
  });

  it("returns 502 when the fetcher throws on the main request", async () => {
    fetchMock.mockRejectedValueOnce(new Error("dns"));
    const r = await app.inject({
      method: "GET",
      url: `/${TEST_API_KEY}/${TEST_INDEXER}/api?t=movie&imdbid=tt000`,
    });
    expect(r.statusCode).toBe(502);
    expect(r.body).toBe("Bad gateway");
  });
});

describe("unknown ?t= value", () => {
  it("returns 404 with a JSON not-found shape for an unrecognised search type", async () => {
    const r = await app.inject({
      method: "GET",
      url: `/${TEST_API_KEY}/${TEST_INDEXER}/api?t=unknown`,
    });
    expect(r.statusCode).toBe(404);
    expect(r.json()).toMatchObject({ error: "Not found" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
