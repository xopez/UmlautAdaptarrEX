import { expect, test } from "@playwright/test";
import {
  createInstance,
  deleteAllInstances,
  type CreateInstanceInput,
} from "./_setup/api-helpers";

const SAMPLE: CreateInstanceInput = {
  type: "sonarr",
  name: "Sonarr Fixture",
  host: "http://sonarr:8989",
  apiKey: "fixture-api-key-123456789",
};

test.describe("instances edit + delete + toggle", () => {
  test.afterEach(async ({ page }) => {
    await deleteAllInstances(page);
  });

  test("toggle switch flips enabled state and persists across reload", async ({
    page,
  }) => {
    await createInstance(page, SAMPLE);

    await page.goto("/instances");
    await expect(page.getByText(SAMPLE.name)).toBeVisible();

    const enableSwitch = page.getByRole("switch", { name: "Enabled" }).first();
    await expect(enableSwitch).toBeChecked();
    await enableSwitch.click();
    await expect(enableSwitch).not.toBeChecked();

    await page.reload();
    await expect(
      page.getByRole("switch", { name: "Enabled" }).first(),
    ).not.toBeChecked();
  });

  test("edit dialog prefills, lets the user rename, and persists the change", async ({
    page,
  }) => {
    await createInstance(page, SAMPLE);

    await page.goto("/instances");
    await expect(page.getByText(SAMPLE.name)).toBeVisible();

    await page.getByRole("button", { name: "Actions" }).first().click();
    await page.getByRole("menuitem", { name: "Edit" }).click();

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Edit instance" }),
    ).toBeVisible();
    await expect(dialog.getByLabel("Name")).toHaveValue(SAMPLE.name);
    await expect(dialog.getByLabel("Host")).toHaveValue(SAMPLE.host);

    await dialog.getByLabel("Name").fill("Sonarr Renamed");
    await dialog.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Instance updated.")).toBeVisible();
    await expect(page.getByText("Sonarr Renamed")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Sonarr Renamed")).toBeVisible();
  });

  test("delete flow asks for confirmation then removes the instance", async ({
    page,
  }) => {
    await createInstance(page, SAMPLE);

    await page.goto("/instances");
    await expect(page.getByText(SAMPLE.name)).toBeVisible();

    await page.getByRole("button", { name: "Actions" }).first().click();
    await page.getByRole("menuitem", { name: "Delete" }).click();

    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toBeVisible();
    await expect(confirm.getByText(SAMPLE.name).first()).toBeVisible();

    await confirm.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText("Instance deleted.")).toBeVisible();
    await expect(page.getByText(SAMPLE.name)).toHaveCount(0);
  });
});
