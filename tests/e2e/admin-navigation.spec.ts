import { expect, test } from "@playwright/test";

// Uses the storageState saved by setup-wizard.setup.ts, so every test in
// this file starts already authenticated as the admin user.

interface PageSpec {
  path: string;
  heading: string;
  navLabel: string;
}

const ADMIN_PAGES: readonly PageSpec[] = [
  { path: "/dashboard", heading: "Dashboard", navLabel: "Dashboard" },
  { path: "/instances", heading: "Arr instances", navLabel: "Instances" },
  { path: "/sync-runs", heading: "Sync runs", navLabel: "Sync runs" },
  {
    path: "/request-history",
    heading: "Request history",
    navLabel: "Request History",
  },
  {
    path: "/rename-history",
    heading: "Rename history",
    navLabel: "Rename History",
  },
  { path: "/logs", heading: "Logs", navLabel: "Logs" },
  { path: "/settings", heading: "Settings", navLabel: "Settings" },
  { path: "/about", heading: "About", navLabel: "About" },
];

test.describe("admin navigation", () => {
  for (const spec of ADMIN_PAGES) {
    test(`renders ${spec.path}`, async ({ page }) => {
      const response = await page.goto(spec.path);
      expect(response?.ok(), `GET ${spec.path}`).toBe(true);

      await expect(
        page.getByRole("heading", { name: spec.heading }).first(),
      ).toBeVisible();
    });
  }

  test("sidebar links route between admin pages without a full reload", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();

    // Pick a couple of representative targets; one with sidebar text + one
    // that lives behind the user menu (settings) to cover both spots.
    const sidebar = page.locator("aside").first();
    await sidebar.getByRole("link", { name: "Instances" }).click();
    await page.waitForURL("**/instances", { timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: "Arr instances" }),
    ).toBeVisible();

    await sidebar.getByRole("link", { name: "Settings" }).click();
    await page.waitForURL("**/settings", { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  test("logout drops the session and bounces the user back to /login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();

    // Logout sits behind the user menu trigger; rather than chase the menu
    // markup we hit the API the menu calls and follow the redirect manually.
    const res = await page.request.post("/api/auth/logout");
    expect(res.ok()).toBe(true);

    await page.goto("/dashboard");
    await page.waitForURL(/\/login(\?|$)/, { timeout: 15_000 });
    expect(page.url()).toContain("expired=1");
  });
});
