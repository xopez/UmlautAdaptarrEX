import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Single SQLite file used by both globalSetup (which wipes + migrates it)
// and the dev webServer. Lives next to the regular dev DB so prisma's
// relative `file:` URL resolves the same way as in production.
const TEST_DB_PATH = path.join(__dirname, "data", "test-e2e.db");
const TEST_DB_URL = `file:${TEST_DB_PATH}`;

const STORAGE_STATE_PATH = path.join(
  __dirname,
  "tests",
  "e2e",
  ".auth",
  "admin.json",
);

const NEXT_PORT = process.env.E2E_NEXT_PORT ?? "5007";
const FASTIFY_PORT = process.env.E2E_FASTIFY_PORT ?? "5005";
const NEXT_BASE_URL = `http://127.0.0.1:${NEXT_PORT}`;
const FASTIFY_BASE_URL = `http://127.0.0.1:${FASTIFY_PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"]],
  globalSetup: path.join(__dirname, "tests/e2e/_setup/global-setup.ts"),
  use: {
    baseURL: process.env.E2E_BASE_URL ?? NEXT_BASE_URL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    // Force English regardless of host locale so role/text selectors stay
    // deterministic across machines.
    locale: "en-US",
  },
  projects: [
    {
      name: "auth-setup",
      testMatch: /.*\.setup\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: STORAGE_STATE_PATH,
      },
      dependencies: ["auth-setup"],
      testIgnore: /.*\.setup\.ts$/,
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: `${NEXT_BASE_URL}/login`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      DATABASE_URL: TEST_DB_URL,
      // Pin the Fastify gateway + Next dev server to the ports our base URLs
      // expect; next.config.ts forwards `/api/*` to API_UPSTREAM.
      PORT: FASTIFY_PORT,
      API_UPSTREAM: FASTIFY_BASE_URL,
      NODE_ENV: "development",
      // Static CSRF secret keeps cookies stable across webServer restarts
      // (so a re-run with `reuseExistingServer` does not invalidate state).
      CSRF_SECRET: "test-e2e-csrf-secret-fixed-for-determinism-32b",
    },
  },
});

export const E2E_PATHS = {
  testDbPath: TEST_DB_PATH,
  testDbUrl: TEST_DB_URL,
  storageStatePath: STORAGE_STATE_PATH,
};
