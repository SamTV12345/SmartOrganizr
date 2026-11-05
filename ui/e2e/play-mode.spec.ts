import { test, expect, CLUB_ID, E2E_USER } from "./fixtures";
import type { Page } from "@playwright/test";

// Play mode: open an event program, turn pages with pedal keys and taps, cross
// from one piece into the next, fall back gracefully for a piece without PDF,
// and switch to double pages. PDFs are generated in-test so pdf.js renders real
// documents.

const EVENT_ID = "event-play-1";

/** Builds a minimal, valid multi-page PDF with a big label on every page. */
function makePdf(label: string, pages: number): Buffer {
    const objects: string[] = [];
    const pageIds = Array.from({ length: pages }, (_, i) => 4 + i * 2);
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages} >>`;
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    pageIds.forEach((id, i) => {
        const text = `BT /F1 48 Tf 60 700 Td (${label} - Seite ${i + 1}) Tj ET`;
        objects[id] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${id + 1} 0 R >>`;
        objects[id + 1] = `<< /Length ${text.length} >>\nstream\n${text}\nendstream`;
    });
    let out = "%PDF-1.4\n";
    const offsets: number[] = [];
    for (let i = 1; i < objects.length; i++) {
        offsets[i] = out.length;
        out += `${i} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xref = out.length;
    out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < objects.length; i++) out += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    out += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(out, "latin1");
}

async function mockPlaylist(page: Page, api: import("./fixtures").ApiMock) {
    api.json(`/v1/clubs/${E2E_USER.sub}`, []);
    api.json("/v1/notifications/unread-summary", { total: 0, clubs: [] });
    api.json(`/v1/clubs/${CLUB_ID}/events/${EVENT_ID}/program/playlist`, [
        { entryId: "e1", title: "Abel Tasman", position: 0, noteId: "note-a", pdfAvailable: true, match: "own" },
        { entryId: "e2", title: "Böhmischer Traum", position: 1, noteId: "note-b", pdfAvailable: true, match: "title" },
        { entryId: "e3", title: "Ansprache Vorstand", position: 2, noteText: "2 Minuten", noteId: null, pdfAvailable: false, match: "none" },
    ]);
    // Registered after the fixture's catch-all, so it wins for PDF downloads.
    await page.route("**/api/v1/elements/*/pdf", (route) => {
        const url = route.request().url();
        if (url.includes("note-a")) {
            return route.fulfill({ status: 200, contentType: "application/pdf", body: makePdf("Abel Tasman", 2) });
        }
        // Web uploads are stored as base64 data URLs — the player must cope with both.
        const dataUrl = "data:application/pdf;base64," + makePdf("Boehmischer Traum", 3).toString("base64");
        return route.fulfill({ status: 200, contentType: "application/octet-stream", body: dataUrl });
    });
}

const status = (page: Page) => page.getByTestId("player-status");

test.describe("play mode, portrait", () => {
    test.use({ viewport: { width: 768, height: 1024 }, locale: "de-DE" });

    test("turns pages with pedal keys and taps across pieces", async ({ page, api }) => {
        await mockPlaylist(page, api);
        await page.goto(`/ui/play/event/${CLUB_ID}/${EVENT_ID}`);

        await expect(status(page)).toHaveText("Abel Tasman – Stück 1/3 · Seite 1/2");
        await expect(page.locator("canvas")).toHaveCount(1);

        // Pedals send PageDown/PageUp (or arrows).
        await page.keyboard.press("PageDown");
        await expect(status(page)).toHaveText("Abel Tasman – Stück 1/3 · Seite 2/2");
        await page.keyboard.press("PageDown");
        await expect(status(page)).toHaveText("Böhmischer Traum – Stück 2/3 · Seite 1/3");
        await page.keyboard.press("PageUp");
        await expect(status(page)).toHaveText("Abel Tasman – Stück 1/3 · Seite 2/2");

        // Tap right half = forward, tap left edge = back.
        const stage = page.getByRole("application");
        const box = (await stage.boundingBox())!;
        await stage.click({ position: { x: box.width * 0.9, y: box.height / 2 } });
        await expect(status(page)).toHaveText("Böhmischer Traum – Stück 2/3 · Seite 1/3");
        await page.screenshot({ path: "test-results/play-mode-portrait.png" });
        await stage.click({ position: { x: box.width * 0.05, y: box.height / 2 } });
        await expect(status(page)).toHaveText("Abel Tasman – Stück 1/3 · Seite 2/2");
    });

    test("shows a placeholder for a piece without PDF and jumps via the setlist", async ({ page, api }) => {
        await mockPlaylist(page, api);
        await page.goto(`/ui/play/event/${CLUB_ID}/${EVENT_ID}?start=3`);

        await expect(page.getByText("Dieses Stück ist nicht in deiner Notenbibliothek.")).toBeVisible();
        await expect(page.getByText("2 Minuten")).toBeVisible();

        // End of setlist is reported instead of silently doing nothing.
        await page.keyboard.press("ArrowRight");
        await expect(page.getByText("Ende der Setlist")).toBeVisible();

        // Setlist panel: jump straight to piece 2.
        await page.getByRole("button", { name: "Setlist" }).click();
        await page.getByRole("button", { name: /Böhmischer Traum/ }).click();
        await expect(status(page)).toHaveText("Böhmischer Traum – Stück 2/3 · Seite 1/3");
    });
});

test.describe("play mode, landscape", () => {
    test.use({ viewport: { width: 1366, height: 768 }, locale: "de-DE" });

    test("shows two pages side by side and steps by spreads", async ({ page, api }) => {
        await mockPlaylist(page, api);
        await page.goto(`/ui/play/event/${CLUB_ID}/${EVENT_ID}?start=2`);

        await expect(status(page)).toHaveText("Böhmischer Traum – Stück 2/3 · Seiten 1–2/3");
        await expect(page.locator("canvas")).toHaveCount(2);
        await page.screenshot({ path: "test-results/play-mode-landscape.png" });

        await page.keyboard.press("ArrowRight");
        await expect(status(page)).toHaveText("Böhmischer Traum – Stück 2/3 · Seite 3/3");
        await expect(page.locator("canvas")).toHaveCount(1);

        // The toolbar hides itself after the start; a tap in the middle brings it back.
        await expect(page.getByRole("button", { name: "Schließen" })).toBeHidden();
        await page.getByRole("application").click({ position: { x: 600, y: 400 } });
        // Force single pages via the toolbar (auto → single).
        await page.getByRole("button", { name: "Seitenansicht: automatisch" }).click();
        await page.keyboard.press("ArrowLeft");
        await expect(status(page)).toHaveText("Böhmischer Traum – Stück 2/3 · Seite 2/3");
    });
});
