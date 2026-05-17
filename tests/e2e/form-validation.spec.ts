import { expect, test } from "@playwright/test";
import { deleteAllInstances } from "./_setup/api-helpers";

test.describe("login form validation", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("empty submit keeps the user on /login and flags invalid fields", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign in" }).click();

    expect(page.url()).toContain("/login");

    const username = page.getByLabel("Username");
    await expect(username).toHaveAttribute("aria-invalid", "true");
  });
});

test.describe("instance dialog validation", () => {
  test.afterEach(async ({ page }) => {
    await deleteAllInstances(page);
  });

  test("submit stays disabled until name/host/api-key clear schema validation", async ({
    page,
  }) => {
    await page.goto("/instances");
    await page.getByRole("button", { name: "Add instance" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Empty submit -> dialog stays open, validation messages show.
    await dialog.getByRole("button", { name: "Add instance" }).click();
    await expect(dialog).toBeVisible();

    // Invalid host (no scheme) + too-short api key -> still rejected client
    // side, dialog stays open.
    await dialog.getByLabel("Name").fill("Sonarr Test");
    await dialog.getByLabel("Host").fill("sonarr-no-scheme");
    await dialog.getByLabel("API key").fill("short");
    await dialog.getByRole("button", { name: "Add instance" }).click();
    await expect(dialog).toBeVisible();

    // Fixing host + key passes validation; the dialog closes and the
    // toast shows. We delete the row in afterEach.
    await dialog.getByLabel("Host").fill("http://sonarr:8989");
    await dialog.getByLabel("API key").fill("a-valid-length-api-key-12345678");
    await dialog.getByRole("button", { name: "Add instance" }).click();
    await expect(page.getByText("Instance created.")).toBeVisible();
    await expect(dialog).not.toBeVisible();
  });

  test("year-matching tolerance input declares min=0 and max=5", async ({
    page,
  }) => {
    await page.goto("/instances");
    await page.getByRole("button", { name: "Add instance" }).click();
    const dialog = page.getByRole("dialog");

    const tolerance = dialog.getByLabel("Year matching tolerance", {
      exact: false,
    });
    await expect(tolerance).toHaveAttribute("min", "0");
    await expect(tolerance).toHaveAttribute("max", "5");

    await dialog.getByRole("button", { name: "Cancel" }).click();
  });
});
