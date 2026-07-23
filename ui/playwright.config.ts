import { defineConfig, devices } from "@playwright/test";

// Shared e2e infra. The rsbuild dev server serves the SPA over https with a
// self-signed cert (needed so keycloak-js has Web Crypto off-localhost); all
// /api and /public traffic is mocked per-test via the fixture, so the backend
// need not run. Do not point tests at a real backend here.
const BASE_URL = "https://localhost:5173";

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,
    reporter: [["list"]],
    use: {
        baseURL: BASE_URL,
        ignoreHTTPSErrors: true,
        trace: "off",
    },
    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    ],
    webServer: {
        command: "pnpm dev",
        url: BASE_URL + "/ui/",
        ignoreHTTPSErrors: true,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
