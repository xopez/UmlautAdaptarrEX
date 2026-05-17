import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequest, mockRename } = vi.hoisted(() => ({
  mockRequest: { create: vi.fn() },
  mockRename: { create: vi.fn() },
}));

vi.mock("@/lib/db", () => ({
  prisma: { requestHistory: mockRequest, renameHistory: mockRename },
}));

const { mockState } = vi.hoisted(() => ({
  mockState: {
    settings: { appApiKey: "" },
    languagePack: {},
    getByExternalId: vi.fn(),
    findByTitle: vi.fn(),
    toRewriteSearchItem: vi.fn(),
    isPausedNow: vi.fn(() => false),
  },
}));

vi.mock("@/server/state", () => ({
  getAppState: () => mockState,
}));

vi.mock("@/server/security/ssrf", () => ({
  isPrivateHost: () => false,
}));

const { mockRewrite, mockAggregate } = vi.hoisted(() => ({
  mockRewrite: vi.fn((body: string) => body),
  mockAggregate: vi.fn((bodies: string[]) => bodies.join("|")),
}));

vi.mock("@/domain/xml", () => ({
  rewriteIndexerXml: mockRewrite,
  aggregateIndexerResponses: mockAggregate,
}));

vi.mock("@/domain/normalization/index", () => ({
  getLidarrTitleForExternalId: (s: string) => s,
  getReadarrTitleForExternalId: (s: string) => s,
}));

import { handleSearch } from "@/server/routes/legacy/search";

interface FakeFetcher {
  fetch: ReturnType<typeof vi.fn>;
}

function makeReq(overrides: object = {}) {
  return {
    ip: "127.0.0.1",
    url: "/key/host.example/api?t=tvsearch&q=Realm+of+Ravens",
    params: { apiKey: "key", "*": "host.example/api" },
    headers: { "user-agent": "Sonarr/4" },
    log: { warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    ...overrides,
  };
}

interface FakeReply {
  _statusCode: number | null;
  _headers: Record<string, string>;
  _payload: unknown;
  code: ReturnType<typeof vi.fn>;
  header: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
}

function makeReply(): FakeReply {
  const reply = {
    _statusCode: null,
    _headers: {},
    _payload: null,
  } as FakeReply;
  reply.code = vi.fn((c: number) => {
    reply._statusCode = c;
    return reply;
  });
  reply.header = vi.fn((k: string, v: string) => {
    reply._headers[k] = v;
    return reply;
  });
  reply.send = vi.fn((p: unknown) => {
    reply._payload = p;
    return reply;
  });
  return reply;
}

beforeEach(() => {
  mockRequest.create.mockReset().mockResolvedValue({});
  mockRename.create.mockReset().mockResolvedValue({});
  mockState.settings.appApiKey = "";
  mockState.getByExternalId.mockReset();
  mockState.findByTitle.mockReset();
  mockState.toRewriteSearchItem.mockReset();
  mockRewrite.mockClear();
  mockAggregate.mockClear();
});

afterEach(() => {
  mockRequest.create.mockReset();
  mockRename.create.mockReset();
});

describe("handleSearch without an upfront searchItem", () => {
  it("forwards a single fetcher response when no item matches the query", async () => {
    mockState.getByExternalId.mockReturnValueOnce(null);
    const fetcher: FakeFetcher = {
      fetch: vi.fn().mockResolvedValueOnce({
        status: 200,
        contentType: "application/xml",
        body: Buffer.from("<rss/>"),
        cacheHit: false,
      }),
    };
    const reply = makeReply();
    await handleSearch(
      makeReq() as never,
      reply as never,
      { type: "tvsearch" },
      { fetcher: fetcher as never },
    );
    expect(fetcher.fetch).toHaveBeenCalledOnce();
    expect(reply._statusCode).toBe(200);
    expect(mockRequest.create).toHaveBeenCalledOnce();
  });

  it("returns 502 when the fetcher throws", async () => {
    mockState.getByExternalId.mockReturnValueOnce(null);
    const fetcher: FakeFetcher = {
      fetch: vi.fn().mockRejectedValueOnce(new Error("network")),
    };
    const reply = makeReply();
    await handleSearch(
      makeReq() as never,
      reply as never,
      { type: "tvsearch" },
      { fetcher: fetcher as never },
    );
    expect(reply._statusCode).toBe(502);
  });

  it("never reports cacheHit=true when the response was a failure", async () => {
    // Regression: cacheHit was initialised to true and only AND-narrowed by
    // each successful fetch. A throw on the main (or any variation) fetch
    // ended in the catch block with status=502 but cacheHit still true,
    // so the request-history page showed errors as "cached" hits.
    mockState.getByExternalId.mockReturnValueOnce(null);
    const fetcher: FakeFetcher = {
      fetch: vi.fn().mockRejectedValueOnce(new Error("network")),
    };
    await handleSearch(
      makeReq() as never,
      makeReply() as never,
      { type: "tvsearch" },
      { fetcher: fetcher as never },
    );
    expect(mockRequest.create).toHaveBeenCalledOnce();
    const recorded = mockRequest.create.mock.calls[0]![0].data as {
      status: number;
      cacheHit: boolean;
    };
    expect(recorded.status).toBe(502);
    expect(recorded.cacheHit).toBe(false);
  });

  it("masks cacheHit when a variation throw downgrades the status to 502", async () => {
    // Main fetch is a clean cache hit, but a variation fetch throws. Without
    // the fix, cacheHit=true bled through alongside lastStatus=502.
    mockState.getByExternalId.mockReturnValueOnce({
      id: "i1",
      mediaType: "tv",
      expectedTitle: "Realm of Ravens",
      titleSearchVariations: ["Lied der Schwarzen Raben"],
      titleMatchVariations: ["Realm of Ravens", "Lied der Schwarzen Raben"],
      authorMatchVariations: [],
    });
    mockState.toRewriteSearchItem.mockReturnValue({});
    const fetcher: FakeFetcher = {
      fetch: vi
        .fn()
        .mockResolvedValueOnce({
          status: 200,
          contentType: "application/xml",
          body: Buffer.from("<rss/>"),
          cacheHit: true,
        })
        .mockRejectedValueOnce(new Error("variation-network")),
    };
    await handleSearch(
      {
        ...makeReq(),
        url: "/key/host.example/api?t=tvsearch&tvdbid=121361&q=Realm+of+Ravens",
      } as never,
      makeReply() as never,
      { type: "tvsearch" },
      { fetcher: fetcher as never },
    );
    expect(mockRequest.create).toHaveBeenCalledOnce();
    const recorded = mockRequest.create.mock.calls[0]![0].data as {
      status: number;
      cacheHit: boolean;
    };
    expect(recorded.status).toBe(502);
    expect(recorded.cacheHit).toBe(false);
  });
});

describe("handleSearch with a searchItem", () => {
  it("issues an extra fetch per title-search variation", async () => {
    mockState.getByExternalId.mockReturnValueOnce({
      id: "i1",
      mediaType: "tv",
      expectedTitle: "Realm of Ravens",
      titleSearchVariations: ["Lied der Schwarzen Raben"],
      titleMatchVariations: ["Realm of Ravens", "Lied der Schwarzen Raben"],
      authorMatchVariations: [],
    });
    mockState.toRewriteSearchItem.mockReturnValue({});
    const fetcher: FakeFetcher = {
      fetch: vi.fn().mockResolvedValue({
        status: 200,
        contentType: "application/xml",
        body: Buffer.from("<rss/>"),
        cacheHit: false,
      }),
    };
    const reply = makeReply();
    await handleSearch(
      {
        ...makeReq(),
        url: "/key/host.example/api?t=tvsearch&tvdbid=121361&q=Realm+of+Ravens",
      } as never,
      reply as never,
      { type: "tvsearch" },
      { fetcher: fetcher as never },
    );
    // 1 main fetch + at least 1 variation fetch.
    expect(fetcher.fetch.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(reply._statusCode).toBe(200);
  });
});

describe("handleSearch routing variants", () => {
  it("falls through to title-based lookup for tvsearch with a 'q' param only", async () => {
    mockState.findByTitle.mockReturnValueOnce(null);
    const fetcher: FakeFetcher = {
      fetch: vi.fn().mockResolvedValueOnce({
        status: 200,
        contentType: "application/xml",
        body: Buffer.from("<rss/>"),
        cacheHit: false,
      }),
    };
    await handleSearch(
      {
        ...makeReq(),
        url: "/key/host.example/api?t=tvsearch&q=Some+Show",
      } as never,
      makeReply() as never,
      { type: "tvsearch" },
      { fetcher: fetcher as never },
    );
    expect(mockState.findByTitle).toHaveBeenCalledWith("tv", "Some Show");
  });

  it("uses the readarr category map for ?t=search with a book category", async () => {
    mockState.getByExternalId.mockReturnValueOnce(null);
    const fetcher: FakeFetcher = {
      fetch: vi.fn().mockResolvedValueOnce({
        status: 200,
        contentType: "application/xml",
        body: Buffer.from("<rss/>"),
        cacheHit: false,
      }),
    };
    await handleSearch(
      {
        ...makeReq(),
        url: "/key/host.example/api?t=search&q=Some+Book&cat=7000",
      } as never,
      makeReply() as never,
      { type: "search" },
      { fetcher: fetcher as never },
    );
    expect(mockState.getByExternalId).toHaveBeenCalledWith("book", "Some Book");
  });

  it("uses the lidarr category map for ?t=search with an audio category", async () => {
    mockState.getByExternalId.mockReturnValueOnce(null);
    const fetcher: FakeFetcher = {
      fetch: vi.fn().mockResolvedValueOnce({
        status: 200,
        contentType: "application/xml",
        body: Buffer.from("<rss/>"),
        cacheHit: false,
      }),
    };
    await handleSearch(
      {
        ...makeReq(),
        url: "/key/host.example/api?t=search&q=Some+Album&cat=3000",
      } as never,
      makeReply() as never,
      { type: "search" },
      { fetcher: fetcher as never },
    );
    expect(mockState.getByExternalId).toHaveBeenCalledWith(
      "audio",
      "Some Album",
    );
  });
});

describe("handleSearch validation", () => {
  it("rejects when assertLegacyContext fails (missing target)", async () => {
    const fetcher: FakeFetcher = { fetch: vi.fn() };
    const reply = makeReply();
    await handleSearch(
      makeReq({ params: {} }) as never,
      reply as never,
      { type: "tvsearch" },
      { fetcher: fetcher as never },
    );
    expect(reply._statusCode).toBe(400);
    expect(fetcher.fetch).not.toHaveBeenCalled();
  });
});
