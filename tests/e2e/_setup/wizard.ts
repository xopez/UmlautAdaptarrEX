import { expect, type Locator, type Page } from "@playwright/test";

// CardTitle (src/components/ui/card.tsx) renders as a <div>, so the
// step titles in the setup wizard are not exposed via the heading role.
// We target them via the unique class signature shadcn applies to
// CardTitle (the sidebar's step labels don't carry these classes).
export function setupStepTitle(page: Page, name: string): Locator {
  return page.locator(".leading-none.tracking-tight").filter({ hasText: name });
}

export interface WizardCredentials {
  username: string;
  password: string;
  proxyUsername: string;
  proxyPassword: string;
}

export const DEFAULT_WIZARD_CREDS: WizardCredentials = {
  username: "e2e-admin",
  password: "e2e-admin-password-1",
  proxyUsername: "e2e-proxy",
  proxyPassword: "e2e-proxy-password-1",
};

// Walks the wizard end-to-end with the "skip Prowlarr" branch so we don't
// need a live Prowlarr instance during E2E. Selects the recommended
// "Proxy mode" so the proxy step still runs (legacy mode would skip it
// and short-circuit to /dashboard via finalSubmit).
export async function completeSetupWizard(
  page: Page,
  creds: WizardCredentials = DEFAULT_WIZARD_CREDS,
): Promise<void> {
  await page.goto("/setup");
  await expect(setupStepTitle(page, "Admin account")).toBeVisible();

  await page.getByLabel("Username").fill(creds.username);
  await page.locator('input[id="password"]').fill(creds.password);

  await page.getByRole("button", { name: "Continue" }).click();

  await expect(setupStepTitle(page, "Operation mode")).toBeVisible();
  await page.getByRole("radio", { name: /Proxy mode/i }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(setupStepTitle(page, "Select plugins")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(setupStepTitle(page, "Connect Prowlarr")).toBeVisible();
  await page.getByRole("button", { name: "Skip Prowlarr setup" }).click();

  await expect(setupStepTitle(page, "HTTP-Proxy credentials")).toBeVisible();
  await page.getByLabel("Proxy username").fill(creds.proxyUsername);
  await page.locator('input[id="proxyPassword"]').fill(creds.proxyPassword);
  await page.getByRole("button", { name: "Complete setup" }).click();

  await page.waitForURL("**/dashboard", { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}
