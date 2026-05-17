import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requestMock = vi.fn();

vi.mock("undici", () => ({
  request: (...args: unknown[]) => requestMock(...args),
}));

import { fetchProwlarrApplications } from "@/arr/prowlarr/applications";

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
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("fetchProwlarrApplications", () => {
  it("blocks private hosts when strict mode is enabled", async () => {
    vi.stubEnv("UA_BLOCK_PRIVATE_INSTANCE_HOSTS", "true");
    const r = await fetchProwlarrApplications(
      "http://192.168.1.5",
      "key-1234567890",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain("private");
    }
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("returns parsed apps for a 200 response", async () => {
    requestMock.mockResolvedValueOnce(
      jsonResponse([
        {
          id: 1,
          name: "Living Room",
          implementation: "Sonarr",
          syncLevel: "fullSync",
          fields: [
            { name: "baseUrl", value: "http://sonarr.local" },
            { name: "apiKey", value: "abcdef1234567890" },
          ],
        },
        {
          id: 2,
          name: "Movies",
          implementation: "Radarr",
          fields: [
            { name: "baseUrl", value: "http://radarr.local" },
            { name: "apiKey", value: "key-radarr-12345" },
          ],
        },
      ]),
    );
    const r = await fetchProwlarrApplications("http://prowlarr.local", "k");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.apps).toHaveLength(2);
      const sonarr = r.apps.find((a) => a.type === "sonarr");
      expect(sonarr?.host).toBe("http://sonarr.local");
      expect(sonarr?.apiKey).toBe("abcdef1234567890");
    }
  });

  it("surfaces masked-api-key apps with an empty key so the user can fill it in", async () => {
    requestMock.mockResolvedValueOnce(
      jsonResponse([
        {
          id: 3,
          name: "Masked",
          implementation: "Sonarr",
          fields: [
            { name: "baseUrl", value: "http://sonarr.local" },
            { name: "apiKey", value: "*".repeat(32) },
          ],
        },
      ]),
    );
    const r = await fetchProwlarrApplications("http://prowlarr.local", "k");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.apps).toHaveLength(1);
      expect(r.apps[0]?.apiKey).toBe("");
    }
  });

  it("flags unsupported implementations as skipped", async () => {
    requestMock.mockResolvedValueOnce(
      jsonResponse([
        {
          id: 4,
          name: "Whisparr",
          implementation: "Whisparr",
          fields: [{ name: "baseUrl", value: "http://w.local" }],
        },
      ]),
    );
    const r = await fetchProwlarrApplications("http://prowlarr.local", "k");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.skipped[0]?.reason).toBe("unsupported_type");
    }
  });

  it("returns ok=false with status on a 401", async () => {
    requestMock.mockResolvedValueOnce(jsonResponse({}, 401));
    const r = await fetchProwlarrApplications("http://prowlarr.local", "bad");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(401);
  });

  it("returns ok=false on a network error", async () => {
    requestMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const r = await fetchProwlarrApplications("http://prowlarr.local", "k");
    expect(r.ok).toBe(false);
  });

  it("flags apps without a baseUrl as missing_host", async () => {
    requestMock.mockResolvedValueOnce(
      jsonResponse([
        {
          id: 5,
          name: "NoHost",
          implementation: "Sonarr",
          fields: [{ name: "apiKey", value: "k1234567890" }],
        },
        {
          id: 7,
          name: "BadHost",
          implementation: "Sonarr",
          fields: [{ name: "baseUrl", value: "javascript:alert(1)" }],
        },
      ]),
    );
    const r = await fetchProwlarrApplications("http://prowlarr.local", "k");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.skipped).toHaveLength(2);
      expect(r.skipped.every((s) => s.reason === "missing_host")).toBe(true);
    }
  });

  it("returns invalid_response when the body is not an array", async () => {
    requestMock.mockResolvedValueOnce(jsonResponse({ error: "weird" }));
    const r = await fetchProwlarrApplications("http://prowlarr.local", "k");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("invalid_response");
  });
});
