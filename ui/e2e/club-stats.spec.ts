import { test, expect, baseClub, CLUB_ID, E2E_USER } from "./fixtures";

const stats = {
    windowDays: 90,
    members: [
        {
            userId: "u-alice",
            displayName: "Alice Anwesend",
            sectionId: "sec-flute",
            sectionName: "Flöten",
            eligibleTotal: 10,
            attendedTotal: 9,
            rateTotal: 0.9,
            eligibleWindow: 4,
            attendedWindow: 4,
            rateWindow: 1,
        },
        {
            userId: "u-bob",
            displayName: "Bob Selten",
            sectionId: "",
            sectionName: "",
            eligibleTotal: 10,
            attendedTotal: 2,
            rateTotal: 0.2,
            eligibleWindow: 4,
            attendedWindow: 0,
            rateWindow: 0,
        },
    ],
    sections: [
        {
            sectionId: "sec-flute",
            sectionName: "Flöten",
            memberCount: 1,
            eligibleTotal: 10,
            attendedTotal: 9,
            rateTotal: 0.9,
            rateWindow: 1,
        },
        {
            sectionId: "",
            sectionName: "",
            memberCount: 1,
            eligibleTotal: 10,
            attendedTotal: 2,
            rateTotal: 0.2,
            rateWindow: 0,
        },
    ],
};

test("renders per-section and per-member attendance rates", async ({ page, api }) => {
    await api.json(`/v1/clubs/${E2E_USER.sub}`, [baseClub()], { method: "GET" });
    await api.json("/stats/attendance", stats, { method: "GET" });

    await page.goto(`/ui/clubs/${CLUB_ID}?section=statistik`);

    // Section aggregates.
    await expect(page.getByText("Anwesenheit pro Register")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Flöten").first()).toBeVisible();
    await expect(page.getByText("Ohne Register")).toBeVisible();
    // The 90% Flöten rate is shown.
    await expect(page.getByText("90%").first()).toBeVisible();

    // Per-member table.
    await expect(page.getByText("Anwesenheit pro Mitglied")).toBeVisible();
    await expect(page.getByText("Alice Anwesend")).toBeVisible();
    await expect(page.getByText("Bob Selten")).toBeVisible();
    // Bob's zero window rate renders as 0%.
    await expect(page.getByText("0%").first()).toBeVisible();
});
