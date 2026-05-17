import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requestMock = vi.fn();

vi.mock("undici", () => ({
  request: (...args: unknown[]) => requestMock(...args),
}));

import { RadarrClient } from "@/arr/radarr";
import { makeTitlePayload, type TitleProvider } from "@/providers/types";

function jsonResponse(data: unknown, statusCode = 200) {
  return {
    statusCode,
    body: {
      json: async () => data,
      text: async () => JSON.stringify(data),
    },
  };
}

function makeProvider(
  bulk: Map<string, ReturnType<typeof makeTitlePayload>> = new Map(),
): TitleProvider {
  return {
    name: "stub",
    supportedLanguages: () => ["de"],
    fetchByExternalId: async () => null,
    fetchByTitle: async () => null,
    fetchBulk: vi.fn().mockResolvedValue(bulk),
  };
}

beforeEach(() => {
  requestMock.mockReset();
});

afterEach(() => {
  requestMock.mockReset();
});

describe("RadarrClient.fetchAllItems", () => {
  it("returns an empty array when the upstream returns nothing", async () => {
    requestMock.mockResolvedValueOnce(jsonResponse({}, 500));
    const client = new RadarrClient({
      instanceId: "i",
      instanceName: "n",
      host: "http://radarr.local",
      apiKey: "k",
      userAgent: "UA",
      provider: makeProvider(),
    });
    expect(await client.fetchAllItems()).toEqual([]);
  });

  it("prefers Radarr's local German alternate title over the provider", async () => {
    requestMock.mockResolvedValueOnce(
      jsonResponse([
        {
          id: 1,
          tmdbId: 9999,
          title: "The Movie",
          alternateTitles: [
            { title: "Der Film", language: { id: 4, name: "German" } },
          ],
        },
      ]),
    );

    const provider = makeProvider(
      new Map([
        [
          "9999",
          makeTitlePayload({
            titlesByLang: { de: "Provider Title (worse)" },
          }),
        ],
      ]),
    );

    const client = new RadarrClient({
      instanceId: "i",
      instanceName: "n",
      host: "http://radarr.local",
      apiKey: "k",
      userAgent: "UA",
      provider,
    });

    const items = await client.fetchAllItems();
    expect(items).toHaveLength(1);
    expect(items[0]?.germanTitle).toBe("Der Film");
  });

  it("falls back to the provider when no German alternate title is present", async () => {
    requestMock.mockResolvedValueOnce(
      jsonResponse([
        {
          id: 1,
          tmdbId: 1,
          title: "X",
        },
      ]),
    );

    const provider = makeProvider(
      new Map([["1", makeTitlePayload({ titlesByLang: { de: "iks" } })]]),
    );

    const client = new RadarrClient({
      instanceId: "i",
      instanceName: "n",
      host: "http://radarr.local",
      apiKey: "k",
      userAgent: "UA",
      provider,
    });

    const items = await client.fetchAllItems();
    expect(items[0]?.germanTitle).toBe("iks");
  });

  it("drops movies without a tmdbId", async () => {
    requestMock.mockResolvedValueOnce(
      jsonResponse([
        { id: 1, title: "No TMDB" },
        { id: 2, tmdbId: 5, title: "Yes TMDB" },
      ]),
    );

    const client = new RadarrClient({
      instanceId: "i",
      instanceName: "n",
      host: "http://radarr.local",
      apiKey: "k",
      userAgent: "UA",
      provider: makeProvider(),
    });

    const items = await client.fetchAllItems();
    expect(items).toHaveLength(1);
    expect(items[0]?.externalId).toBe("5");
  });

  it("recognises German via either the language id (4) or the name", async () => {
    requestMock.mockResolvedValueOnce(
      jsonResponse([
        {
          id: 1,
          tmdbId: 1,
          title: "X",
          alternateTitles: [{ title: "By id", language: { id: 4 } }],
        },
        {
          id: 2,
          tmdbId: 2,
          title: "Y",
          alternateTitles: [{ title: "By name", language: { name: "German" } }],
        },
      ]),
    );

    const client = new RadarrClient({
      instanceId: "i",
      instanceName: "n",
      host: "http://radarr.local",
      apiKey: "k",
      userAgent: "UA",
      provider: makeProvider(),
    });

    const items = await client.fetchAllItems();
    expect(items.find((i) => i.externalId === "1")?.germanTitle).toBe("By id");
    expect(items.find((i) => i.externalId === "2")?.germanTitle).toBe(
      "By name",
    );
  });
});
