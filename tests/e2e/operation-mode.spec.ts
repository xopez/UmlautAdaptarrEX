import { expect, test } from "@playwright/test";
import { setOperationMode } from "./_setup/api-helpers";

test.describe("operation-mode picker on settings", () => {
  test.afterEach(async ({ page }) => {
    // Setup wizard left the DB at "proxy"; reset to that so subsequent
    // tests in this run see a stable starting state.
    await setOperationMode(page, "proxy");
  });

  test("dirties on selection, persists on save, surfaces the restart hint", async ({
    page,
  }) => {
    await page.goto("/settings");
    await expect(
      page.getByRole("heading", { name: "Operation mode" }),
    ).toBeVisible();

    const proxy = page.getByRole("radio", { name: /Proxy mode/i });
    const both = page.getByRole("radio", { name: /^Both$/i });

    await expect(proxy).toHaveAttribute("data-state", "checked");
    await expect(
      page.getByRole("button", { name: "Save mode" }),
    ).toBeDisabled();

    await both.click();
    await expect(both).toHaveAttribute("data-state", "checked");
    await expect(
      page.getByText(/the legacy API on port 5005 switches immediately/i),
    ).toBeVisible();

    const saveButton = page.getByRole("button", { name: "Save mode" });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    await expect(
      page.getByText("Operation mode saved.", { exact: false }),
    ).toBeVisible();
    await expect(page.getByText(/Server restart required/i)).toBeVisible();

    // Reload + assert the value is persisted: the picker hydrates from
    // /api/admin/settings, so this proves the PUT actually wrote.
    await page.reload();
    await expect(page.getByRole("radio", { name: /^Both$/i })).toHaveAttribute(
      "data-state",
      "checked",
    );
  });

  test("cancel discards the pending change", async ({ page }) => {
    await page.goto("/settings");
    await expect(
      page.getByRole("heading", { name: "Operation mode" }),
    ).toBeVisible();

    const legacy = page.getByRole("radio", {
      name: /Index API \(legacy\)/i,
    });
    await legacy.click();
    await expect(legacy).toHaveAttribute("data-state", "checked");

    await page.getByRole("button", { name: "Cancel" }).click();

    const proxy = page.getByRole("radio", { name: /Proxy mode/i });
    await expect(proxy).toHaveAttribute("data-state", "checked");
    await expect(
      page.getByRole("button", { name: "Save mode" }),
    ).toBeDisabled();
  });
});
