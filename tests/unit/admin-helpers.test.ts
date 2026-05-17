import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { clampInt, parseOrReply } from "@/server/routes/admin/_helpers";

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

describe("parseOrReply", () => {
  const Schema = z.object({ name: z.string().min(1) });

  it("returns the parsed payload on a valid body", () => {
    const reply = makeReply();
    const data = parseOrReply({ name: "ok" }, Schema, reply as never);
    expect(data).toEqual({ name: "ok" });
    expect(reply.code).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
  });

  it("emits a 400 with { error: 'validation', issues } and returns null on failure", () => {
    const reply = makeReply();
    const data = parseOrReply({ name: "" }, Schema, reply as never);
    expect(data).toBeNull();
    expect(reply._statusCode).toBe(400);
    const payload = reply._payload as { error: string; issues: unknown[] };
    expect(payload.error).toBe("validation");
    expect(Array.isArray(payload.issues)).toBe(true);
    expect(payload.issues.length).toBeGreaterThan(0);
  });

  it("returns null when the body is undefined", () => {
    const reply = makeReply();
    const data = parseOrReply(undefined, Schema, reply as never);
    expect(data).toBeNull();
    expect(reply._statusCode).toBe(400);
  });
});

describe("clampInt", () => {
  it("returns the default when the input is undefined or NaN", () => {
    expect(clampInt(undefined, 20, 1, 100)).toBe(20);
    expect(clampInt("not-a-number", 20, 1, 100)).toBe(20);
  });

  it("clamps below the minimum", () => {
    expect(clampInt("0", 20, 1, 100)).toBe(1);
    expect(clampInt("-5", 20, 1, 100)).toBe(1);
  });

  it("clamps above the maximum", () => {
    expect(clampInt("999", 20, 1, 100)).toBe(100);
  });

  it("returns the input verbatim when it sits inside the range", () => {
    expect(clampInt("42", 20, 1, 100)).toBe(42);
  });

  it("treats an empty string as the default (parseInt → NaN)", () => {
    expect(clampInt("", 20, 1, 100)).toBe(20);
  });
});
