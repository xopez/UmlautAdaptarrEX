import { expect, test } from "@playwright/test";
import { deleteAllInstances } from "./_setup/api-helpers";

// Hits the real /api/admin/stats. After setup the DB has zero requests and
// zero renames, so the KPI rows render with "0" placeholders. We assert on
// shape, not specific magnitudes (those belong to the API-level tests).
test.describe("dashboard", () => {
  test.afterEach(async ({ page }) => {
    await deleteAllInstances(page);
  });

  test("KPI cards render against the real /api/admin/stats endpoint", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();

    await expect(page.getByText("Active instances")).toBeVisible();
    await expect(page.getByText(/Requests \(24h\)/i)).toBeVisible();
    await expect(page.getByText(/Renames \(24h\)/i)).toBeVisible();
  });

  test("empty-state copy renders when no instances exist", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
    await expect(page.getByText(/No instances connected yet/i)).toBeVisible();
  });

  test("sync-now confirm dialog disables its action while no instances exist", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();

    // Header trigger is always present; the footer "Sync now" inside the
    // dialog is what gets disabled when there are no enabled instances.
    await page
      .getByRole("button", { name: /^Sync now$/ })
      .first()
      .click();

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Run sync now?" }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: /^Sync now$/ }),
    ).toBeDisabled();
  });
});
