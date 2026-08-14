import { test, expect, baseClub, E2E_USER } from "./fixtures";

// Proves the shared fixture works end to end: the app runs the real keycloak-js
// flow (intercepted by the fixture) and renders the dashboard with a mocked club.
test("boots past auth and shows the dashboard", async ({ page, api }) => {
    api.json(`/v1/clubs/${E2E_USER.sub}`, [baseClub()]);
    api.json("/v1/notifications/unread-summary", { total: 0, clubs: [] });
    // tolerate any other dashboard fetches
    api.json("/v1/clubs", [baseClub()]);

    await page.goto("/ui/dashboard");

    await expect(page.getByText(baseClub().name as string).first()).toBeVisible({ timeout: 15_000 });
});
