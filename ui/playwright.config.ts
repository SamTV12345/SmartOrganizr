import { defineConfig, devices } from "@playwright/test";

// Shared e2e infra. The rsbuild dev server serves the SPA over https with a
// self-signed cert (needed so keycloak-js has Web Crypto off-localhost). Auth
// and all /api + /public traffic are mocked per-test via the fixture, which
// intercepts the Keycloak OAuth flow — so neither the backend nor a real IdP
// needs to run. Do not point tests at a real backend here.
const BASE_URL = "https://localhost:5173";

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [["list"]],
    use: {
        baseURL: BASE_URL,
        ignoreHTTPSErrors: true,
        trace: "on-first-retry",
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: {
        command: "pnpm dev",
        url: BASE_URL + "/ui/",
        ignoreHTTPSErrors: true,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
