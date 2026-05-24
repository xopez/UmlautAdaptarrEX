import { describe, expect, it } from "vitest";
import {
  redactApiKey,
  redactApiKeyInPath,
  redactApiKeyInQuery,
} from "@/lib/log-redact";

describe("redactApiKeyInQuery", () => {
  it("masks apikey query parameter", () => {
    expect(redactApiKeyInQuery("http://x.com/api?apikey=abc123&t=caps")).toBe(
      "http://x.com/api?apikey=[REDACTED]&t=caps",
    );
  });

  it("handles api_key and api-key variants case-insensitively", () => {
    expect(redactApiKeyInQuery("/api?api_key=abc")).toBe(
      "/api?api_key=[REDACTED]",
    );
    expect(redactApiKeyInQuery("/api?API-Key=abc")).toBe(
      "/api?API-Key=[REDACTED]",
    );
  });

  it("leaves strings without apikey untouched", () => {
    expect(redactApiKeyInQuery("/api?t=caps")).toBe("/api?t=caps");
  });

  it("redacts multiple occurrences", () => {
    expect(redactApiKeyInQuery("?apikey=a&apikey=b")).toBe(
      "?apikey=[REDACTED]&apikey=[REDACTED]",
    );
  });
});

describe("redactApiKeyInPath", () => {
  it("masks the first path segment when it looks like an api key", () => {
    expect(redactApiKeyInPath("/abcdef1234567890/indexer.example.com/api")).toBe(
      "/[REDACTED]/indexer.example.com/api",
    );
  });

  it("leaves short first segments alone (not a key)", () => {
    expect(redactApiKeyInPath("/api/health")).toBe("/api/health");
    expect(redactApiKeyInPath("/login")).toBe("/login");
  });

  it("handles bare key path with no trailing slash", () => {
    expect(redactApiKeyInPath("/abcdef1234567890")).toBe("/[REDACTED]");
  });
});

describe("redactApiKey (combined)", () => {
  it("redacts both path segment and apikey query param", () => {
    expect(
      redactApiKey(
        "/abcdef1234567890/indexer.example.com/api?apikey=xyz&t=caps",
      ),
    ).toBe("/[REDACTED]/indexer.example.com/api?apikey=[REDACTED]&t=caps");
  });

  it("works on a full HTTP request line", () => {
    expect(
      redactApiKey("GET http://x.com/api?apikey=xyz&t=caps HTTP/1.1"),
    ).toContain("apikey=[REDACTED]");
  });
});
