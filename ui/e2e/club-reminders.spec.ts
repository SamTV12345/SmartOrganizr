import { test, expect, baseClub, CLUB_ID, E2E_USER } from "./fixtures";

// Reminders for open event responses: the club setting (off by default), the
// "remind open" button on events with undecided members, and the in-app toast
// when a reminder arrives over the notification stream.

const EVENT_ID = "event-remind-1";

function clubMocks(api: import("./fixtures").ApiMock) {
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
}

test.use({ locale: "de-DE" });

test("leader turns automatic reminders on", async ({ page, api }) => {
    clubMocks(api);
    let saved: unknown = null;
    let current: number | null = null;
    await page.route(`**/api/v1/clubs/${CLUB_ID}/reminder-settings`, (route) => {
        if (route.request().method() === "PUT") {
            saved = route.request().postDataJSON();
            current = (saved as { hoursBefore?: number }).hoursBefore ?? null;
        }
        return route.fulfill({ json: { hoursBefore: current } });
    });

    await page.goto(`/ui/clubs/${CLUB_ID}?section=bearbeiten`);
    const select = page.getByTestId("reminder-setting");
    await expect(select).toHaveValue("off");
    await select.selectOption("48");
    await expect.poll(() => saved).toEqual({ hoursBefore: 48 });
    await expect(select).toHaveValue("48");
    await expect(select.locator("option:checked")).toHaveText("2 Tage vorher");
});

test("leader reminds members who have not answered", async ({ page, api }) => {
    clubMocks(api);
    api.json(`/v1/clubs/${CLUB_ID}/events`, [
        {
            id: EVENT_ID, clubId: CLUB_ID, summary: "Generalprobe", description: "", location: "", eventType: "REHEARSAL",
            startDate: "2099-08-01T18:00:00Z", endDate: "", cancelled: false, myStatus: "", myReason: "",
            yesCount: 10, noCount: 2, maybeCount: 1, undecidedCount: 4,
        },
    ]);
    let calls = 0;
    await page.route(`**/api/v1/clubs/${CLUB_ID}/events/${EVENT_ID}/remind`, (route) => {
        calls++;
        return route.fulfill({ json: { sent: calls === 1 ? 4 : 0 } });
    });

    await page.goto(`/ui/clubs/${CLUB_ID}?section=termine`);
    await page.getByTestId("remind-open").click();
    await expect(page.getByText("4 Mitglieder erinnert")).toBeVisible();
    await page.getByTestId("remind-open").click();
    await expect(page.getByText("Alle Offenen wurden in den letzten 12 Stunden schon erinnert")).toBeVisible();
});

test("an incoming reminder shows a toast that leads to the dashboard", async ({ page, api }) => {
    api.json(`/v1/clubs/${E2E_USER.sub}`, []);
    api.json("/v1/notifications/unread-summary", { total: 0, clubs: [] });
    // Overrides the fixture's empty stream with one reminder event.
    await page.route("**/v1/notifications/stream", (route) =>
        route.fulfill({
            status: 200,
            contentType: "text/event-stream",
            body: `data: ${JSON.stringify({ type: "club_event_reminder", clubId: CLUB_ID, eventId: EVENT_ID, preview: "Generalprobe" })}\n\n`,
        }),
    );
    await page.goto("/ui/myDates");
    const toast = page.getByTestId("reminder-toast");
    await expect(toast).toContainText("Bitte antworte noch: Generalprobe");
    await toast.getByRole("link", { name: "Jetzt antworten" }).click();
    await expect(page).toHaveURL(/\/ui\/dashboard/);
    await expect(toast).toBeHidden();
});
