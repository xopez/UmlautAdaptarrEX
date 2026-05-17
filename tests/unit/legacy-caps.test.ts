import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockState, mockRequest } = vi.hoisted(() => ({
  mockState: { settings: { appApiKey: "" } },
  mockRequest: { create: vi.fn() },
}));

vi.mock("@/server/state", () => ({
  getAppState: () => mockState,
}));

vi.mock("@/lib/db", () => ({
  prisma: { requestHistory: mockRequest },
}));

vi.mock("@/server/security/ssrf", () => ({
  isPrivateHost: () => false,
}));

import { handleCaps } from "@/server/routes/legacy/caps";

interface FakeFetcher {
  fetch: ReturnType<typeof vi.fn>;
}

function makeReq(overrides: object = {}) {
  return {
    ip: "127.0.0.1",
    url: "/key/host.example/api?t=caps",
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
  mockState.settings.appApiKey = "";
  mockRequest.create.mockReset();
  mockRequest.create.mockResolvedValue({});
});

afterEach(() => {
  mockRequest.create.mockReset();
});

describe("handleCaps", () => {
  it("forwards the indexer body with status and content-type", async () => {
    const fetcher: FakeFetcher = {
      fetch: vi.fn().mockResolvedValueOnce({
        status: 200,
        contentType: "application/xml",
        body: Buffer.from("<caps/>"),
        cacheHit: false,
      }),
    };
    const req = makeReq();
    const reply = makeReply();
    await handleCaps(req as never, reply as never, {
      fetcher: fetcher as never,
    });
    expect(reply._statusCode).toBe(200);
    expect(reply._headers["content-type"]).toBe("application/xml");
    expect((reply._payload as Buffer).toString()).toBe("<caps/>");
  });

  it("records the request with cache-hit info", async () => {
    const fetcher: FakeFetcher = {
      fetch: vi.fn().mockResolvedValueOnce({
        status: 200,
        contentType: "application/xml",
        body: Buffer.from("<caps/>"),
        cacheHit: true,
      }),
    };
    await handleCaps(makeReq() as never, makeReply() as never, {
      fetcher: fetcher as never,
    });
    expect(mockRequest.create).toHaveBeenCalledOnce();
    const args = mockRequest.create.mock.calls[0]?.[0] as {
      data: { type: string; cacheHit: boolean };
    };
    expect(args.data.type).toBe("caps");
    expect(args.data.cacheHit).toBe(true);
  });

  it("returns 502 'Bad gateway' on a fetcher error", async () => {
    const fetcher: FakeFetcher = {
      fetch: vi.fn().mockRejectedValueOnce(new Error("network")),
    };
    const reply = makeReply();
    await handleCaps(makeReq() as never, reply as never, {
      fetcher: fetcher as never,
    });
    expect(reply._statusCode).toBe(502);
    expect(reply._payload).toBe("Bad gateway");
  });

  it("rejects with 400 when the request fails legacy validation", async () => {
    const fetcher: FakeFetcher = { fetch: vi.fn() };
    const reply = makeReply();
    await handleCaps(makeReq({ params: {} }) as never, reply as never, {
      fetcher: fetcher as never,
    });
    expect(reply._statusCode).toBe(400);
    expect(fetcher.fetch).not.toHaveBeenCalled();
  });
});
