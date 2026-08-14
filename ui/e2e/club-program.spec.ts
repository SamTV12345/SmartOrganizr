import { test, expect, baseClub, CLUB_ID, E2E_USER } from "./fixtures";

// Exercises the per-event program (setlist) tab: open an event, add a library
// note + a free-text piece, reorder, remove, and save (asserting the PUT body).

const EVENT_ID = "event-e2e-1";

function baseMocks(api: import("./fixtures").ApiMock) {
    api.json(`/v1/clubs/${E2E_USER.sub}`, [baseClub()]);
    api.json("/v1/notifications/unread-summary", { total: 0, clubs: [] });
    api.json(`/v1/clubs/${CLUB_ID}/me/permissions`, {
        role: "LEITER",
        can_manage_roles: true,
        can_invite_members: true,
        can_manage_events: true,
        section_write: {},
    });
    api.json(`/v1/clubs/${CLUB_ID}/members`, []);
    api.json(`/v1/clubs/${CLUB_ID}/sections`, []);
    // Events list for the Programm tab.
    api.json(`/v1/clubs/${CLUB_ID}/events`, [
        {
            id: EVENT_ID,
            clubId: CLUB_ID,
            summary: "Sommerkonzert",
            description: "",
            location: "",
            eventType: "CONCERT",
            startDate: "2026-08-01T18:00:00Z",
            endDate: "",
            cancelled: false,
            myStatus: "",
            myReason: "",
            yesCount: 0,
            noCount: 0,
            maybeCount: 0,
            undecidedCount: 0,
        },
    ]);
    // Note picker source (existing per-user note list endpoint).
    api.json("/v1/elements/notes", {
        page: { size: 50, totalElements: 1, totalPages: 1, number: 0 },
        _embedded: {
            noteRepresentationModelList: [
                { id: "note-1", name: "Radetzky-Marsch", type: "note" },
            ],
        },
    });
}

test("add, reorder, remove and save an event program", async ({ page, api }) => {
    baseMocks(api);
    // Program starts empty, then we capture the saved body.
    api.json(`/v1/clubs/${CLUB_ID}/events/${EVENT_ID}/program`, [], { method: "GET" });

    let savedBody: unknown = null;
    await page.route("**/api/**", async (route) => {
        const req = route.request();
        if (req.method() === "PUT" && req.url().includes(`/events/${EVENT_ID}/program`)) {
            savedBody = req.postDataJSON();
            return route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify([]),
            });
        }
        return route.fallback();
    });

    await page.goto(`/ui/clubs/${CLUB_ID}?section=programm`);

    // The Programm tab lists events; expand ours.
    await expect(page.getByTestId("program-event").first()).toBeVisible({ timeout: 15_000 });
    await page.getByTestId(`program-event-toggle-${EVENT_ID}`).click();

    await expect(page.getByTestId("program-empty")).toBeVisible();

    // Add a library note.
    await page.getByTestId("program-note-select").click();
    await page.getByRole("option", { name: "Radetzky-Marsch" }).click();
    await page.getByTestId("program-add-note").click();

    // Add a free-text piece and title it.
    await page.getByTestId("program-add-free").click();
    const titles = page.getByTestId("program-entry-title");
    await expect(titles).toHaveCount(2);
    await titles.nth(1).fill("Zugabe");

    // Order is [Radetzky-Marsch, Zugabe]; move the second up so it's first.
    await page.getByTestId("program-entry-down").first().click();
    await expect(page.getByTestId("program-entry-title").nth(0)).toHaveValue("Zugabe");
    await expect(page.getByTestId("program-entry-title").nth(1)).toHaveValue("Radetzky-Marsch");

    // Remove the now-second entry, leaving one.
    await page.getByTestId("program-entry-remove").nth(1).click();
    await expect(page.getByTestId("program-entry")).toHaveCount(1);

    await page.getByTestId("program-save").click();

    await expect.poll(() => savedBody).not.toBeNull();
    expect(savedBody).toEqual({ entries: [{ title: "Zugabe" }] });
});
