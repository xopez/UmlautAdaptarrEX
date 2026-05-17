import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requestMock = vi.fn();

vi.mock("undici", () => ({
  request: (...args: unknown[]) => requestMock(...args),
}));

import { ReadarrClient } from "@/arr/readarr";

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

describe("ReadarrClient.fetchAllItems", () => {
  it("strips the author prefix from book titles", async () => {
    requestMock
      .mockResolvedValueOnce(
        jsonResponse([{ id: 1, authorName: "Gregory P. Stark" }]),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: 10,
            authorId: 1,
            title: "Gregory P. Stark: A Crown of Ravens",
          },
        ]),
      );

    const client = new ReadarrClient({
      instanceId: "i",
      instanceName: "n",
      host: "http://readarr.local",
      apiKey: "k",
      userAgent: "UA",
    });

    const items = await client.fetchAllItems();
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe("A Crown of Ravens");
  });

  it("trims at the first parenthesis", async () => {
    requestMock
      .mockResolvedValueOnce(jsonResponse([{ id: 1, authorName: "Author" }]))
      .mockResolvedValueOnce(
        jsonResponse([
          { id: 10, authorId: 1, title: "Some Book (German Edition)" },
        ]),
      );

    const client = new ReadarrClient({
      instanceId: "i",
      instanceName: "n",
      host: "http://readarr.local",
      apiKey: "k",
      userAgent: "UA",
    });

    const items = await client.fetchAllItems();
    expect(items[0]?.title).toBe("Some Book");
  });

  it("trims at the first colon when the colon is not the author prefix", async () => {
    requestMock
      .mockResolvedValueOnce(jsonResponse([{ id: 1, authorName: "Author" }]))
      .mockResolvedValueOnce(
        jsonResponse([{ id: 10, authorId: 1, title: "Title: Subtitle" }]),
      );

    const client = new ReadarrClient({
      instanceId: "i",
      instanceName: "n",
      host: "http://readarr.local",
      apiKey: "k",
      userAgent: "UA",
    });

    const items = await client.fetchAllItems();
    expect(items[0]?.title).toBe("Title");
  });

  it("returns an empty array when the upstream is unreachable", async () => {
    requestMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const client = new ReadarrClient({
      instanceId: "i",
      instanceName: "n",
      host: "http://readarr.local",
      apiKey: "k",
      userAgent: "UA",
    });
    expect(await client.fetchAllItems()).toEqual([]);
  });
});
