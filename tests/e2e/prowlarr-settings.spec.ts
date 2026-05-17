import { expect, test } from "@playwright/test";
import { disconnectProwlarr } from "./_setup/api-helpers";

// /api/admin/instances/prowlarr/{test, config PUT} both reach out to the
// configured Prowlarr instance over HTTP, so those two stay mocked. GET +
// DELETE on the config flow real Fastify, and afterEach resets state.

test.describe("settings → Prowlarr connection card", () => {
  test.afterEach(async ({ page }) => {
    await disconnectProwlarr(page);
  });

  test("test connection: success path shows the apps-found banner", async ({
    page,
  }) => {
    let testCalls = 0;
    await page.route("**/api/admin/instances/prowlarr/test", async (route) => {
      testCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, appsCount: 3 }),
      });
    });

    await page.goto("/settings");
    await page.getByRole("tab", { name: "Prowlarr" }).click();

    await expect(
      page.getByRole("heading", { name: "Prowlarr connection" }),
    ).toBeVisible();

    await page.getByLabel("Prowlarr URL").fill("http://prowlarr:9696");
    await page.getByLabel("API key").fill("aaaaaaaaaaaaaaaaaaaaaaaa");
    await page.getByRole("button", { name: "Test connection" }).click();

    await expect(
      page.getByText(/Connection OK,\s*3 apps detected/i),
    ).toBeVisible();
    expect(testCalls).toBe(1);
  });

  test("test connection: failed response surfaces the error string", async ({
    page,
  }) => {
    await page.route("**/api/admin/instances/prowlarr/test", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "auth-failed" }),
      });
    });

    await page.goto("/settings");
    await page.getByRole("tab", { name: "Prowlarr" }).click();

    await page.getByLabel("Prowlarr URL").fill("http://prowlarr:9696");
    await page.getByLabel("API key").fill("aaaaaaaaaaaaaaaaaaaaaaaa");
    await page.getByRole("button", { name: "Test connection" }).click();

    await expect(page.getByText(/auth-failed/)).toBeVisible();
  });

  test("save → disconnect flow: UI confirms, DELETE clears the stored config", async ({
    page,
  }) => {
    // PUT contacts Prowlarr to count apps, so we mock it. The UI then
    // believes the save succeeded and surfaces the "Disconnect" button.
    await page.route(
      "**/api/admin/instances/prowlarr/config",
      async (route) => {
        if (route.request().method() === "PUT") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ok: true,
              configured: true,
              appsCount: 0,
            }),
          });
          return;
        }
        await route.continue();
      },
    );

    await page.goto("/settings");
    await page.getByRole("tab", { name: "Prowlarr" }).click();

    await page.getByLabel("Prowlarr URL").fill("http://prowlarr:9696");
    await page.getByLabel("API key").fill("aaaaaaaaaaaaaaaaaaaaaaaa");
    await page.getByRole("button", { name: "Save connection" }).click();
    await expect(page.getByText(/Saved,/)).toBeVisible();

    await page.getByRole("button", { name: "Disconnect" }).first().click();
    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: "Disconnect" }).click();

    await expect(page.getByText("Prowlarr connection removed.")).toBeVisible();
  });
});
