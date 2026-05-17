import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requestMock = vi.fn();

vi.mock("undici", () => ({
  request: (...args: unknown[]) => requestMock(...args),
}));

import { LidarrClient } from "@/arr/lidarr";

function jsonResponse(data: unknown, statusCode = 200) {
  return {
    statusCode,
    body: {
      json: async () => data,
      text: async () => JSON.stringify(data),
    },
  };
}

beforeEach(() => {
  requestMock.mockReset();
});

afterEach(() => {
  requestMock.mockReset();
});

describe("LidarrClient.fetchAllItems", () => {
  it("returns an empty array when the artist fetch fails", async () => {
    requestMock.mockResolvedValueOnce(jsonResponse({}, 500));
    const client = new LidarrClient({
      instanceId: "i",
      instanceName: "n",
      host: "http://lidarr.local",
      apiKey: "k",
      userAgent: "UA",
    });
    expect(await client.fetchAllItems()).toEqual([]);
  });

  it("flattens artist+album into one item per album", async () => {
    requestMock
      .mockResolvedValueOnce(
        jsonResponse([
          { id: 1, artistName: "Artist A" },
          { id: 2, artistName: "Artist B" },
        ]),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          { id: 10, artistId: 1, title: "Album One" },
          { id: 11, artistId: 1, title: "Album Two" },
        ]),
      )
      .mockResolvedValueOnce(
        jsonResponse([{ id: 20, artistId: 2, title: "Solo" }]),
      );

    const client = new LidarrClient({
      instanceId: "i",
      instanceName: "n",
      host: "http://lidarr.local",
      apiKey: "k",
      userAgent: "UA",
    });

    const items = await client.fetchAllItems();
    expect(items).toHaveLength(3);
    expect(items.map((i) => i.title).sort()).toEqual([
      "Album One",
      "Album Two",
      "Solo",
    ]);
    expect(items.every((i) => i.mediaType === "audio")).toBe(true);
  });
});
