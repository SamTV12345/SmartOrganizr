import { test, expect, baseClub, CLUB_ID, E2E_USER } from "./fixtures";

// A leader (can_manage_events) can create a poll and any member can vote; the
// results bar reflects the updated counts. The backend is fully mocked.
test("create a poll and cast a vote", async ({ page, api }) => {
    // ClubDetailView bootstrap fetches.
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
    api.json(`/v1/clubs/${CLUB_ID}/invitations`, []);

    // Poll list: starts empty, then holds a created poll, then the poll after a vote.
    const optA = { id: "opt-a", label: "June", voteCount: 0, votedByMe: false };
    const optB = { id: "opt-b", label: "July", voteCount: 0, votedByMe: false };
    const created = {
        id: "poll-1",
        question: "Summer date?",
        multipleChoice: false,
        closed: false,
        totalVotes: 0,
        options: [optA, optB],
    };
    api.json(`/v1/clubs/${CLUB_ID}/polls`, [], { method: "GET" });

    await page.goto(`/ui/clubs/${CLUB_ID}?section=umfragen`);

    // Create form is visible for a leader. (The e2e app runs with English i18n.)
    await expect(page.getByText("Create poll").first()).toBeVisible({ timeout: 15_000 });

    await page.getByLabel("Question").fill("Summer date?");
    await page.getByLabel("Answer option 1").fill("June");
    await page.getByLabel("Answer option 2").fill("July");

    // After creating, the list returns the new poll.
    api.empty(`/v1/clubs/${CLUB_ID}/polls`, { method: "POST" });
    api.json(`/v1/clubs/${CLUB_ID}/polls`, [created], { method: "GET" });

    await page.getByRole("button", { name: "Create poll" }).click();

    await expect(page.getByText("Summer date?")).toBeVisible();
    await expect(page.getByText("June")).toBeVisible();

    // Cast a vote for July; after voting the list reflects the tallied result.
    api.empty(`/v1/clubs/${CLUB_ID}/polls/poll-1/vote`, { method: "POST" });
    api.json(
        `/v1/clubs/${CLUB_ID}/polls`,
        [
            {
                ...created,
                totalVotes: 1,
                options: [optA, { ...optB, voteCount: 1, votedByMe: true }],
            },
        ],
        { method: "GET" },
    );

    await page.getByRole("radio").nth(1).check();
    await page.getByRole("button", { name: "Vote" }).click();

    // Result bar for July fills to 100%.
    await expect(page.getByTestId("bar-opt-b")).toHaveAttribute("style", /width:\s*100%/);
    await expect(page.getByText("1 votes total")).toBeVisible();
});
