import { describe, expect, it } from "vitest";
import { PluginToggleSchema } from "@/schemas/plugins";

describe("PluginToggleSchema", () => {
  it("accepts true and false", () => {
    expect(PluginToggleSchema.safeParse({ enabled: true }).success).toBe(true);
    expect(PluginToggleSchema.safeParse({ enabled: false }).success).toBe(true);
  });

  it("rejects truthy non-boolean values", () => {
    expect(PluginToggleSchema.safeParse({ enabled: 1 }).success).toBe(false);
    expect(PluginToggleSchema.safeParse({ enabled: "true" }).success).toBe(
      false,
    );
  });

  it("requires the enabled field", () => {
    expect(PluginToggleSchema.safeParse({}).success).toBe(false);
  });
});
