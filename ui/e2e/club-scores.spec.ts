import { test, expect, baseClub, CLUB_ID, E2E_USER } from "./fixtures";
import type { Page } from "@playwright/test";

// Club sheet music archive: a manager creates a piece and uploads parts (the
// section is suggested from the file name); in the play mode a member gets the
// part of their section, can switch parts, and is asked to choose when no
// part fits their section.

const SCORE_ID = "score-1";
const EVENT_ID = "event-score-1";
const sections = [
    { id: "sec-kl", name: "Klarinetten", memberCount: 3 },
    { id: "sec-tb", name: "Tiefes Blech", memberCount: 2 },
];

function minimalPdf(label: string): Buffer {
    const text = `BT /F1 40 Tf 60 700 Td (${label}) Tj ET`;
    const objs = [
        "",
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    ];
    let out = "%PDF-1.4\n";
    const offsets: number[] = [];
    for (let i = 1; i < objs.length; i++) {
        offsets[i] = out.length;
        out += `${i} 0 obj\n${objs[i]}\nendobj\n`;
    }
    const xref = out.length;
    out += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < objs.length; i++) out += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    out += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(out, "latin1");
}

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
    api.json(`/v1/clubs/${CLUB_ID}/sections`, sections);
}

test.describe("club sheet music archive", () => {
    test.use({ locale: "de-DE" });

    test("manager creates a piece and uploads parts with suggested sections", async ({ page, api }) => {
        clubMocks(api);
        // Stateful backend for the archive.
        const score = { id: SCORE_ID, title: "Abel Tasman", composer: "Kees Vlak", arranger: null, partCount: 0, createdAt: "2026-11-05T10:00:00Z", parts: [] as unknown[] };
        let created = false;
        const uploaded: { name: string; sectionId: string | null }[] = [];
        await page.route(`**/api/v1/clubs/${CLUB_ID}/scores**`, async (route) => {
            const req = route.request();
            const url = new URL(req.url());
            if (req.method() === "POST" && url.pathname.endsWith("/scores")) {
                expect(req.postDataJSON()).toMatchObject({ title: "Abel Tasman", composer: "Kees Vlak" });
                created = true;
                return route.fulfill({ json: score });
            }
            if (req.method() === "POST" && url.pathname.endsWith("/parts")) {
                const body = req.postDataBuffer()?.toString("latin1") ?? "";
                const name = /name="name"\r\n\r\n([^\r]*)/.exec(body)?.[1] ?? "";
                const sectionId = /name="sectionId"\r\n\r\n([^\r]*)/.exec(body)?.[1] ?? null;
                uploaded.push({ name, sectionId });
                score.parts.push({ id: `part-${uploaded.length}`, scoreId: SCORE_ID, name, sectionId, sectionName: sections.find((s) => s.id === sectionId)?.name ?? null, position: uploaded.length, sizeBytes: 1234 });
                score.partCount = score.parts.length;
                return route.fulfill({ json: score });
            }
            if (url.pathname.endsWith("/scores")) return route.fulfill({ json: created ? [score] : [] });
            return route.fulfill({ json: score });
        });

        await page.goto(`/ui/clubs/${CLUB_ID}?section=notenarchiv`);
        await expect(page.getByText("Noch keine Werke im Archiv.")).toBeVisible();

        await page.getByPlaceholder("Titel des Werks").fill("Abel Tasman");
        await page.getByPlaceholder("Komponist").fill("Kees Vlak");
        await page.getByTestId("score-create").click();
        await expect(page.getByTestId("score-item")).toContainText("Abel Tasman");
        await expect(page.getByText("Noch keine Stimmen hochgeladen.")).toBeVisible();

        await page.getByTestId("part-files").setInputFiles([
            { name: "2. Klarinette in B.pdf", mimeType: "application/pdf", buffer: minimalPdf("Klarinette") },
            { name: "Direktion.pdf", mimeType: "application/pdf", buffer: minimalPdf("Direktion") },
        ]);
        const pending = page.getByTestId("pending-part");
        await expect(pending).toHaveCount(2);
        await expect(pending.nth(0).getByRole("textbox")).toHaveValue("2. Klarinette in B");
        await expect(pending.nth(0).getByTestId("pending-part-section")).toHaveValue("sec-kl");
        await expect(pending.nth(1).getByTestId("pending-part-section")).toHaveValue("");

        await page.getByTestId("parts-upload").click();
        await expect(page.getByTestId("score-part")).toHaveCount(2);
        expect(uploaded).toEqual([
            { name: "2. Klarinette in B", sectionId: "sec-kl" },
            { name: "Direktion", sectionId: null },
        ]);
        await expect(page.getByTestId("score-item")).toContainText("2 Stimmen");
    });
});

async function playerMocks(page: Page, api: import("./fixtures").ApiMock, state: { chosen?: string }) {
    api.json(`/v1/clubs/${E2E_USER.sub}`, []);
    api.json("/v1/notifications/unread-summary", { total: 0, clubs: [] });
    const parts = [
        { id: "kl1", name: "1. Klarinette", ownSection: true },
        { id: "kl2", name: "2. Klarinette", ownSection: true },
        { id: "dir", name: "Direktion", ownSection: false },
    ];
    await page.route(`**/api/v1/clubs/${CLUB_ID}/events/${EVENT_ID}/program/playlist`, (route) => {
        const partId = state.chosen ?? "kl1";
        return route.fulfill({
            json: [
                {
                    entryId: "e1", title: "Abel Tasman", position: 0, match: "part", pdfAvailable: true,
                    scoreId: SCORE_ID, partId, partName: parts.find((p) => p.id === partId)?.name, parts,
                },
                {
                    entryId: "e2", title: "Böhmischer Traum", position: 1, match: "choosePart", pdfAvailable: false,
                    scoreId: "score-2", parts: [{ id: "tuba", name: "Tuba", ownSection: false }, { id: "bar", name: "Bariton", ownSection: false }],
                },
            ],
        });
    });
    await page.route(`**/api/v1/clubs/${CLUB_ID}/scores/*/parts/*/pdf`, (route) => {
        const partId = route.request().url().split("/parts/")[1].split("/")[0];
        return route.fulfill({ contentType: "application/pdf", body: minimalPdf(`Stimme ${partId}`) });
    });
    await page.route(`**/api/v1/clubs/${CLUB_ID}/scores/*/choice`, (route) => {
        state.chosen = route.request().postDataJSON().partId;
        return route.fulfill({ status: 204 });
    });
}

test.describe("play mode with club parts", () => {
    test.use({ viewport: { width: 768, height: 1024 }, locale: "de-DE" });

    test("plays the member's part, switches parts and asks when none fits", async ({ page, api }) => {
        const state: { chosen?: string } = {};
        await playerMocks(page, api, state);
        await page.goto(`/ui/play/event/${CLUB_ID}/${EVENT_ID}`);

        await expect(page.getByTestId("player-status")).toHaveText("Abel Tasman – Stück 1/2 · Seite 1/1");
        await expect(page.locator("canvas")).toHaveCount(1);

        // Switch 1. → 2. Klarinette from the toolbar.
        await page.getByRole("button", { name: "Stimme wechseln" }).click();
        await page.getByTestId("parts-panel").getByRole("button", { name: "2. Klarinette" }).click();
        await expect.poll(() => state.chosen).toBe("kl2");
        await expect(page.getByRole("button", { name: "Stimme wechseln" })).toContainText("2. Klarinette");

        // Next piece has no part for this section: the member picks one.
        await page.keyboard.press("PageDown");
        await expect(page.getByText("Welche Stimme spielst du?", { exact: false })).toBeVisible();
        await page.getByRole("button", { name: "Bariton" }).click();
        await expect.poll(() => state.chosen).toBe("bar");
    });
});
