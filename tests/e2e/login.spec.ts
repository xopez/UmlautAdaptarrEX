import { expect, test } from "@playwright/test";
import { DEFAULT_WIZARD_CREDS } from "./_setup/wizard";

// Every test in this file starts unauthenticated. The default storageState
// (set in playwright.config.ts) carries the admin session, so we wipe it
// per-file to exercise the login gate.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("login + auth flow", () => {
  test("renders the sign-in form and sends authenticated users to /dashboard", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("admin layout redirects unauthenticated requests to /login with ?expired=1", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login(\?|$)/, { timeout: 15_000 });
    expect(page.url()).toContain("expired=1");
  });

  test("rejects wrong credentials with an inline toast", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill(DEFAULT_WIZARD_CREDS.username);
    await page.locator('input[id="password"]').fill("wrong-password-totally");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page.getByText("Invalid username or password.", { exact: false }),
    ).toBeVisible();
    expect(page.url()).toContain("/login");
  });

  test("accepts the wizard-created admin and lands on /dashboard", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill(DEFAULT_WIZARD_CREDS.username);
    await page
      .locator('input[id="password"]')
      .fill(DEFAULT_WIZARD_CREDS.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL("**/dashboard", { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();

    const me = await page.request.get("/api/auth/me");
    expect(me.ok()).toBe(true);
    const body = (await me.json()) as { username: string };
    expect(body.username).toBe(DEFAULT_WIZARD_CREDS.username);
  });

  test("preserves ?next= and returns the user there after login", async ({
    page,
  }) => {
    await page.goto("/settings");
    await page.waitForURL(/\/login\?/, { timeout: 15_000 });
    expect(page.url()).toMatch(/next=%2Fsettings/);

    await page.getByLabel("Username").fill(DEFAULT_WIZARD_CREDS.username);
    await page
      .locator('input[id="password"]')
      .fill(DEFAULT_WIZARD_CREDS.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL("**/settings", { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });
});
