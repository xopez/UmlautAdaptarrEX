import { expect, test } from "@playwright/test";

// Hits real Fastify; the values come from whatever the setup wizard wrote.
// We intentionally do NOT assert on specific values (those are the API
// tests' job) — only on the navigational shape: tabs, headings, key
// inputs that admins reach for.
test.describe("settings tabs", () => {
  test("renders all five tab triggers and the General tab by default", async ({
    page,
  }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    for (const label of [
      "General",
      "Title providers",
      "Prowlarr",
      "Plugins",
      "Advanced",
    ]) {
      await expect(page.getByRole("tab", { name: label })).toBeVisible();
    }

    // General tab hosts the operation-mode picker as its first card.
    await expect(
      page.getByRole("heading", { name: "Operation mode" }),
    ).toBeVisible();
  });

  test("Prowlarr tab shows the connection card with the URL field", async ({
    page,
  }) => {
    await page.goto("/settings");
    await page.getByRole("tab", { name: "Prowlarr" }).click();

    await expect(
      page.getByRole("heading", { name: "Prowlarr connection" }),
    ).toBeVisible();
    await expect(page.getByLabel("Prowlarr URL")).toBeVisible();
  });

  test("Plugins tab shows the built-in plugins card", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("tab", { name: "Plugins" }).click();

    await expect(
      page.getByRole("heading", { name: "Built-in plugins" }),
    ).toBeVisible();
  });

  test("Advanced tab exposes the user-agent input", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("tab", { name: "Advanced" }).click();

    await expect(page.getByLabel("User-Agent header")).toBeVisible();
  });
});
