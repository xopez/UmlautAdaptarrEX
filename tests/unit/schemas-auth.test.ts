import { describe, expect, it } from "vitest";
import { LoginSchema, SetupSchema } from "@/schemas/auth";

describe("LoginSchema", () => {
  it("accepts a normal username and password", () => {
    expect(
      LoginSchema.safeParse({ username: "admin", password: "x" }).success,
    ).toBe(true);
  });

  it("rejects empty username or password", () => {
    expect(LoginSchema.safeParse({ username: "", password: "x" }).success).toBe(
      false,
    );
    expect(
      LoginSchema.safeParse({ username: "admin", password: "" }).success,
    ).toBe(false);
  });

  it("caps password length at 256 to keep argon2/JSON parsing bounded", () => {
    const longPw = "a".repeat(257);
    expect(
      LoginSchema.safeParse({ username: "admin", password: longPw }).success,
    ).toBe(false);
  });
});

describe("SetupSchema", () => {
  const valid = {
    username: "admin",
    password: "supersafe1",
    proxyUsername: "ua",
    proxyPassword: "anothersafe1",
  };

  it("accepts a minimal valid wizard payload", () => {
    expect(SetupSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects usernames with disallowed characters", () => {
    expect(
      SetupSchema.safeParse({ ...valid, username: "ad min" }).success,
    ).toBe(false);
    expect(
      SetupSchema.safeParse({ ...valid, username: "ad/min" }).success,
    ).toBe(false);
  });

  it("rejects too short or too long admin passwords", () => {
    expect(SetupSchema.safeParse({ ...valid, password: "short" }).success).toBe(
      false,
    );
    expect(
      SetupSchema.safeParse({ ...valid, password: "a".repeat(257) }).success,
    ).toBe(false);
  });

  it("forbids colons and whitespace in proxy username", () => {
    expect(
      SetupSchema.safeParse({ ...valid, proxyUsername: "u:ser" }).success,
    ).toBe(false);
    expect(
      SetupSchema.safeParse({ ...valid, proxyUsername: "u ser" }).success,
    ).toBe(false);
  });

  it("requires a proxy password of at least 8 chars", () => {
    expect(
      SetupSchema.safeParse({ ...valid, proxyPassword: "1234567" }).success,
    ).toBe(false);
  });

  it("accepts an optional installProxyInProwlarr block", () => {
    const r = SetupSchema.safeParse({
      ...valid,
      installProxyInProwlarr: { host: "http://prowlarr.local" },
    });
    expect(r.success).toBe(true);
  });

  it("accepts plugin toggles", () => {
    const r = SetupSchema.safeParse({
      ...valid,
      plugins: [
        { id: "german-umlauts", enabled: true },
        { id: "swedish-umlauts", enabled: false },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("allows tmdbApiKey to be null or omitted", () => {
    expect(SetupSchema.safeParse({ ...valid, tmdbApiKey: null }).success).toBe(
      true,
    );
    expect(SetupSchema.safeParse(valid).success).toBe(true);
  });
});
