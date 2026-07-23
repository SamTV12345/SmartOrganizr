import { test, expect, baseClub, CLUB_ID, E2E_USER } from "./fixtures";

// Absence CRUD from a member's own perspective: create a range, see it listed,
// delete it. The backend is fully mocked; the harness auto-authenticates.
test("member creates and deletes an absence", async ({ page, api }) => {
    const absence = {
        id: "abs-1",
        clubId: CLUB_ID,
        userId: E2E_USER.sub,
        startDate: "2026-08-01",
        endDate: "2026-08-07",
        reason: "Urlaub",
        createdAt: "2026-07-23T10:00:00Z",
    };

    // Baseline routes so ClubDetailView renders.
    api.json(`/v1/clubs/${E2E_USER.sub}`, [baseClub()]);
    api.json("/v1/notifications/unread-summary", { total: 0, clubs: [] });
    api.json(`/v1/clubs/${CLUB_ID}/me/permissions`, {
        role: "MITGLIED",
        can_manage_roles: false,
        can_manage_events: false,
        can_invite_members: false,
        section_write: {},
    });
    api.json(`/v1/clubs/${CLUB_ID}/members`, []);
    api.json(`/v1/clubs/${CLUB_ID}/sections`, []);

    // Absence endpoints: list starts empty; POST echoes the created row.
    api.json(`/v1/clubs/${CLUB_ID}/absences`, [], { method: "GET" });
    api.json(`/v1/clubs/${CLUB_ID}/absences`, absence, { method: "POST" });
    api.empty(`/v1/clubs/${CLUB_ID}/absences/abs-1`, { method: "DELETE" });

    await page.goto(`/ui/clubs/${CLUB_ID}?section=abwesenheiten`);

    // Empty state first.
    await expect(page.getByText(/No absences yet|Keine Abwesenheiten/)).toBeVisible({ timeout: 15_000 });

    // Fill the range. Once submitted the refetch should return the new row.
    await page.locator("#absence-start").fill("2026-08-01");
    await page.locator("#absence-end").fill("2026-08-07");
    api.json(`/v1/clubs/${CLUB_ID}/absences`, [absence], { method: "GET" });

    await page.getByRole("button", { name: /^(Add|Hinzufügen)$/ }).click();

    const row = page.getByTestId("absence-row");
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("2026-08-01");

    // Delete: after the mutation the list goes back to empty.
    api.json(`/v1/clubs/${CLUB_ID}/absences`, [], { method: "GET" });
    await row.getByRole("button").click();
    await page.getByRole("alertdialog").getByRole("button", { name: /^(Delete|Löschen)$/ }).click();

    await expect(page.getByTestId("absence-row")).toHaveCount(0);
});

// The absence data feeds the Termine tab: each event shows an "expected X/Y"
// badge from the availability endpoint (RSVP + absence inference).
test("event shows expected attendance badge", async ({ page, api }) => {
    const event = {
        id: "ev1",
        summary: "Frühjahrskonzert",
        eventType: "CONCERT",
        startDate: "2026-08-05T19:00:00Z",
        yesCount: 0,
        maybeCount: 0,
        noCount: 0,
        undecidedCount: 0,
        cancelled: false,
    };

    api.json(`/v1/clubs/${E2E_USER.sub}`, [baseClub()]);
    api.json("/v1/notifications/unread-summary", { total: 0, clubs: [] });
    api.json(`/v1/clubs/${CLUB_ID}/me/permissions`, {
        role: "MITGLIED",
        can_manage_roles: false,
        can_manage_events: false,
        can_invite_members: false,
        section_write: {},
    });
    api.json(`/v1/clubs/${CLUB_ID}/sections`, []);
    // Events list first, then the more specific availability route so it wins.
    api.json(`/v1/clubs/${CLUB_ID}/events`, [event], { method: "GET" });
    api.json(`/v1/clubs/${CLUB_ID}/events/ev1/availability`, {
        eventId: "ev1",
        expectedCount: 18,
        totalCount: 25,
        rows: [],
    });

    await page.goto(`/ui/clubs/${CLUB_ID}?section=termine`);

    await expect(page.getByText(/(?:erwartet|expected):\s*18\/25/)).toBeVisible({ timeout: 15_000 });
});
