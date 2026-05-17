import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("hashPassword", () => {
  it("produces an argon2id encoded hash", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash.startsWith("$argon2id$")).toBe(true);
  });

  it("returns a different hash for the same input on each call", async () => {
    const a = await hashPassword("same-input");
    const b = await hashPassword("same-input");
    expect(a).not.toEqual(b);
  });
});

describe("verifyPassword", () => {
  it("accepts the original password", async () => {
    const plain = "p@ssw0rd-with-special-chars-äöü";
    const hash = await hashPassword(plain);
    expect(await verifyPassword(hash, plain)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("right");
    expect(await verifyPassword(hash, "wrong")).toBe(false);
  });

  it("is case-sensitive", async () => {
    const hash = await hashPassword("MixedCase");
    expect(await verifyPassword(hash, "mixedcase")).toBe(false);
  });

  it("returns false instead of throwing on a malformed hash", async () => {
    expect(await verifyPassword("not-a-real-argon2-hash", "anything")).toBe(
      false,
    );
    expect(await verifyPassword("", "anything")).toBe(false);
  });

  it("treats empty plaintext as a regular wrong password", async () => {
    const hash = await hashPassword("non-empty");
    expect(await verifyPassword(hash, "")).toBe(false);
  });
});
