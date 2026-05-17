import { expect, test } from "@playwright/test";

// Real /api/admin/settings + regenerate endpoint. We assert the UI shape
// of the confirm flow and that the persisted key actually rotates after
// confirmation; we do not assert on specific values.
test.describe("settings → API key card", () => {
  test("regenerate flow rotates the persisted key after confirmation", async ({
    page,
  }) => {
    await page.goto("/settings");
    await expect(
      page.getByRole("heading", { name: "Application API key" }),
    ).toBeVisible();

    const before = (await page.request
      .get("/api/admin/settings")
      .then((r) => r.json())) as { appApiKey: string };

    await page.getByRole("button", { name: "Regenerate" }).first().click();

    const confirm = page.getByRole("alertdialog");
    await expect(
      confirm.getByRole("heading", { name: "Regenerate API key?" }),
    ).toBeVisible();
    await expect(
      confirm.getByText(/The current key will stop working immediately/),
    ).toBeVisible();

    await confirm.getByRole("button", { name: "Regenerate" }).click();
    await expect(page.getByText("API key regenerated.")).toBeVisible();

    const after = (await page.request
      .get("/api/admin/settings")
      .then((r) => r.json())) as { appApiKey: string };
    expect(after.appApiKey).not.toBe(before.appApiKey);
  });

  test("cancel on the confirm dialog leaves the key untouched", async ({
    page,
  }) => {
    await page.goto("/settings");

    const before = (await page.request
      .get("/api/admin/settings")
      .then((r) => r.json())) as { appApiKey: string };

    await page.getByRole("button", { name: "Regenerate" }).first().click();
    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: "Cancel" }).click();
    await expect(confirm).not.toBeVisible();

    const after = (await page.request
      .get("/api/admin/settings")
      .then((r) => r.json())) as { appApiKey: string };
    expect(after.appApiKey).toBe(before.appApiKey);
  });
});
