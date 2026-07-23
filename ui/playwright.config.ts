import { defineConfig, devices } from "@playwright/test";

// The dev server is HTTPS with a self-signed cert on :5173 under base /ui/, and
// normally proxies /api + /public to the Go backend on :8080. E2E tests never
// hit :8080 — the auth escape hatch (window.__E2E_AUTH__, see src/index.tsx)
// skips Keycloak, and each spec mocks the /api/** calls it needs via page.route.
export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? "line" : [["list"]],
    use: {
        baseURL: "https://localhost:5173",
        ignoreHTTPSErrors: true,
        trace: "on-first-retry",
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: {
        command: "pnpm dev",
        url: "https://localhost:5173/ui/",
        ignoreHTTPSErrors: true,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
