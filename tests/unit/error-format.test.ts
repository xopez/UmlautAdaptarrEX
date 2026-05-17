import { describe, expect, it } from "vitest";
import {
  describeError,
  extractErrorCode,
  extractErrorMessage,
  extractErrorMessageOnly,
} from "@/lib/error-format";

// Local stand-in for the client-only ApiError class. The describeError
// helper duck-types via `name === "ApiError"` so we don't need to import
// the real one (and keep this test runnable in the server-side test setup).
class FakeApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

describe("describeError", () => {
  it("returns the message of a plain Error", () => {
    expect(describeError(new Error("boom"))).toBe("boom");
  });

  it("coerces non-Error values to a string", () => {
    expect(describeError("oops")).toBe("oops");
    expect(describeError(42)).toBe("42");
    expect(describeError(null)).toBe("null");
    expect(describeError(undefined)).toBe("undefined");
  });

  it("falls back to err.message for ApiError without issues", () => {
    const err = new FakeApiError(500, { error: "server" }, "Internal");
    expect(describeError(err)).toBe("Internal");
  });

  it("formats ApiError zod issues as 'field: message; ...'", () => {
    const body = {
      issues: [
        { path: ["host"], message: "Invalid URL" },
        { path: ["apiKey"], message: "Too short" },
      ],
    };
    const err = new FakeApiError(400, body, "Bad Request");
    expect(describeError(err)).toBe("host: Invalid URL; apiKey: Too short");
  });

  it("falls back to err.message when issues are empty or malformed", () => {
    const err1 = new FakeApiError(400, { issues: [] }, "Bad Request");
    expect(describeError(err1)).toBe("Bad Request");
    const err2 = new FakeApiError(400, { issues: "not-an-array" }, "Bad");
    expect(describeError(err2)).toBe("Bad");
  });

  it("handles issues without path by using just the message", () => {
    const err = new FakeApiError(
      400,
      { issues: [{ message: "Required" }] },
      "Bad",
    );
    expect(describeError(err)).toBe("Required");
  });
});

describe("extractErrorMessageOnly", () => {
  it("returns body.message when present", () => {
    expect(extractErrorMessageOnly({ message: "hi" })).toBe("hi");
  });

  it("returns null for missing or empty messages", () => {
    expect(extractErrorMessageOnly({ message: "" })).toBeNull();
    expect(extractErrorMessageOnly({})).toBeNull();
    expect(extractErrorMessageOnly(null)).toBeNull();
    expect(extractErrorMessageOnly("string body")).toBeNull();
  });
});

describe("extractErrorMessage", () => {
  it("prefers body.message over body.error", () => {
    expect(extractErrorMessage({ message: "m", error: "e" })).toBe("m");
  });

  it("falls back to body.error", () => {
    expect(extractErrorMessage({ error: "e" })).toBe("e");
  });

  it("accepts a string body", () => {
    expect(extractErrorMessage("plain")).toBe("plain");
  });

  it("returns 'unknown' for empty/missing channels", () => {
    expect(extractErrorMessage({})).toBe("unknown");
    expect(extractErrorMessage(null)).toBe("unknown");
    expect(extractErrorMessage("")).toBe("unknown");
  });
});

describe("extractErrorCode", () => {
  it("returns body.error when set", () => {
    expect(extractErrorCode({ error: "no_stored_creds" })).toBe(
      "no_stored_creds",
    );
  });

  it("returns null otherwise", () => {
    expect(extractErrorCode({ error: "" })).toBeNull();
    expect(extractErrorCode({})).toBeNull();
    expect(extractErrorCode(null)).toBeNull();
  });
});
