import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockSetting } = vi.hoisted(() => ({
  mockSetting: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: { setting: mockSetting },
}));

import {
  loadStoredProwlarrCreds,
  persistProwlarrCreds,
  replyProwlarrUpstreamError,
} from "@/server/prowlarr-helpers";

interface FakeReply {
  code: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  _statusCode: number | null;
  _payload: unknown;
}

function makeReply(): FakeReply {
  const reply = {
    _statusCode: null as number | null,
    _payload: null as unknown,
  } as FakeReply;
  reply.code = vi.fn((c: number) => {
    reply._statusCode = c;
    return reply;
  });
  reply.send = vi.fn((p: unknown) => {
    reply._payload = p;
    return reply;
  });
  return reply;
}

beforeEach(() => {
  mockSetting.findUnique.mockReset();
  mockSetting.upsert.mockReset();
});

afterEach(() => {
  mockSetting.findUnique.mockReset();
  mockSetting.upsert.mockReset();
});

describe("replyProwlarrUpstreamError", () => {
  it("forwards a 401 verbatim with the unauthorized error code", () => {
    const reply = makeReply();
    replyProwlarrUpstreamError(
      reply as never,
      { ok: false, status: 401, error: "bad creds" },
      "fetch_failed",
    );
    expect(reply._statusCode).toBe(401);
    expect(reply._payload).toEqual({
      error: "unauthorized",
      message: "bad creds",
    });
  });

  it("maps every other failure to a 502 with the provided error code", () => {
    const reply = makeReply();
    replyProwlarrUpstreamError(
      reply as never,
      { ok: false, status: 500, error: "boom" },
      "install_failed",
    );
    expect(reply._statusCode).toBe(502);
    expect(reply._payload).toEqual({
      error: "install_failed",
      message: "boom",
    });
  });

  it("treats a missing status as a 502", () => {
    const reply = makeReply();
    replyProwlarrUpstreamError(
      reply as never,
      { ok: false, error: "network" },
      "fetch_failed",
    );
    expect(reply._statusCode).toBe(502);
  });
});

describe("loadStoredProwlarrCreds", () => {
  it("returns the host and api key when both are configured", async () => {
    mockSetting.findUnique.mockResolvedValueOnce({
      prowlarrHost: "http://prowlarr.local",
      prowlarrApiKey: "abc",
    });
    const reply = makeReply();
    const result = await loadStoredProwlarrCreds(reply as never);
    expect(result).toEqual({
      host: "http://prowlarr.local",
      apiKey: "abc",
    });
    expect(reply.code).not.toHaveBeenCalled();
  });

  it("emits a 409 and returns null when no creds are stored", async () => {
    mockSetting.findUnique.mockResolvedValueOnce(null);
    const reply = makeReply();
    const result = await loadStoredProwlarrCreds(reply as never);
    expect(result).toBeNull();
    expect(reply._statusCode).toBe(409);
    expect(reply._payload).toMatchObject({ error: "no_stored_creds" });
  });

  it("emits a 409 when only the host is set", async () => {
    mockSetting.findUnique.mockResolvedValueOnce({
      prowlarrHost: "http://prowlarr.local",
      prowlarrApiKey: "",
    });
    const reply = makeReply();
    expect(await loadStoredProwlarrCreds(reply as never)).toBeNull();
    expect(reply._statusCode).toBe(409);
  });
});

describe("persistProwlarrCreds", () => {
  it("upserts the host and api key, using the appApiKey only on create", async () => {
    mockSetting.upsert.mockResolvedValueOnce({});
    await persistProwlarrCreds("http://p", "key123", "fallback-app-key");
    expect(mockSetting.upsert).toHaveBeenCalledOnce();
    const args = mockSetting.upsert.mock.calls[0]?.[0] as {
      where: { id: number };
      update: { prowlarrHost: string; prowlarrApiKey: string };
      create: {
        id: number;
        appApiKey: string;
        prowlarrHost: string;
        prowlarrApiKey: string;
      };
    };
    expect(args.where).toEqual({ id: 1 });
    expect(args.update).toEqual({
      prowlarrHost: "http://p",
      prowlarrApiKey: "key123",
    });
    expect(args.create.appApiKey).toBe("fallback-app-key");
    expect(args.create.id).toBe(1);
  });
});
