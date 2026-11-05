import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

// Annotations in the play mode: draw, write, erase, undo; saved per page on
// the server, and kept (and later synced) when the network is gone.

const NOTE_ID = "note-annot-1";

function makePdf(pages: number): Buffer {
    const objects: string[] = [];
    const pageIds = Array.from({ length: pages }, (_, i) => 4 + i * 2);
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages} >>`;
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    pageIds.forEach((id, i) => {
        const text = `BT /F1 24 Tf 60 780 Td (Seite ${i + 1}) Tj ET`;
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

type Server = { pages: Record<number, string>; puts: { page: number; data: string }[]; online: boolean };

async function mockBackend(page: Page, api: import("./fixtures").ApiMock, server: Server) {
    api.json("/v1/notifications/unread-summary", { total: 0, clubs: [] });
    api.json(`/v1/elements/notes/${NOTE_ID}`, { currentNote: { id: NOTE_ID, name: "Abel Tasman", pdfAvailable: true, type: "note" } });
    await page.route(`**/api/v1/elements/${NOTE_ID}/pdf`, (route) =>
        route.fulfill({ contentType: "application/pdf", body: makePdf(2) }),
    );
    await page.route("**/api/v1/annotations**", async (route) => {
        if (!server.online) return route.abort("internetdisconnected");
        const req = route.request();
        if (req.method() === "PUT") {
            const body = req.postDataJSON() as { key: string; page: number; data: string };
            expect(body.key).toBe(NOTE_ID);
            server.puts.push({ page: body.page, data: body.data });
            server.pages[body.page] = body.data;
            return route.fulfill({ status: 204 });
        }
        return route.fulfill({
            json: { key: NOTE_ID, pages: Object.entries(server.pages).map(([p, data]) => ({ page: Number(p), data, updatedAt: "" })) },
        });
    });
}

const lastDoc = (server: Server) => JSON.parse(server.puts[server.puts.length - 1].data);

async function draw(page: Page, from: [number, number], to: [number, number]) {
    const box = (await page.getByTestId("annotation-layer").boundingBox())!;
    await page.mouse.move(box.x + box.width * from[0], box.y + box.height * from[1]);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) {
        await page.mouse.move(
            box.x + box.width * (from[0] + ((to[0] - from[0]) * i) / 10),
            box.y + box.height * (from[1] + ((to[1] - from[1]) * i) / 10),
        );
    }
    await page.mouse.up();
}

test.describe("annotations", () => {
    test.use({ viewport: { width: 768, height: 1024 }, locale: "de-DE" });

    test("draw, write, erase and undo — saved per page and shown again", async ({ page, api }) => {
        const server: Server = { pages: {}, puts: [], online: true };
        await mockBackend(page, api, server);
        await page.goto(`/ui/play/note/${NOTE_ID}`);
        await expect(page.getByTestId("player-status")).toHaveText("Abel Tasman – Seite 1/2");

        await page.getByRole("button", { name: "Anmerkungen" }).click();
        await expect(page.getByTestId("annotation-palette")).toBeVisible();

        // Red pen stroke across the first system.
        await page.getByRole("button", { name: "Stift rot" }).click();
        await draw(page, [0.2, 0.3], [0.7, 0.3]);
        await expect.poll(() => server.puts.length).toBe(1);
        expect(server.puts[0].page).toBe(1);
        expect(lastDoc(server).strokes).toHaveLength(1);
        expect(lastDoc(server).strokes[0].color).toBe("#d32f2f");
        // Drawing must not turn the page.
        await expect(page.getByTestId("player-status")).toHaveText("Abel Tasman – Seite 1/2");

        // Text note.
        await page.getByRole("button", { name: "Text", exact: true }).click();
        const box = (await page.getByTestId("annotation-layer").boundingBox())!;
        await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.5);
        await page.getByTestId("annotation-text-input").fill("hier zählen");
        await page.getByTestId("annotation-text-input").press("Enter");
        await expect.poll(() => lastDoc(server).texts?.[0]?.text).toBe("hier zählen");

        // Erase the stroke, then undo.
        await page.getByRole("button", { name: "Radierer" }).click();
        await page.mouse.click(box.x + box.width * 0.45, box.y + box.height * 0.3);
        await expect.poll(() => lastDoc(server).strokes.length).toBe(0);
        await page.getByRole("button", { name: "Rückgängig" }).click();
        await expect.poll(() => lastDoc(server).strokes.length).toBe(1);

        // Pedal still turns pages while annotating; page 2 has its own (empty) layer.
        await page.keyboard.press("PageDown");
        await expect(page.getByTestId("player-status")).toHaveText("Abel Tasman – Seite 2/2");
        await expect(page.getByTestId("annotation-layer").locator("path")).toHaveCount(0);
        await page.getByRole("button", { name: "Fertig" }).click();
        await expect(page.getByTestId("annotation-palette")).toBeHidden();

        // Fresh load: annotations come back from the server.
        await page.goto(`/ui/play/note/${NOTE_ID}`);
        // The player resumes on page 2 where we left off.
        await expect(page.getByTestId("player-status")).toHaveText("Abel Tasman – Seite 2/2");
        await page.keyboard.press("PageUp");
        await expect(page.getByTestId("player-status")).toHaveText("Abel Tasman – Seite 1/2");
        await expect(page.getByTestId("annotation-layer").locator("path")).toHaveCount(1);
        await expect(page.getByTestId("annotation-layer").locator("text")).toHaveText("hier zählen");
    });

    test("edits made offline are kept and synced when back online", async ({ page, api }) => {
        const server: Server = { pages: {}, puts: [], online: true };
        await mockBackend(page, api, server);
        await page.goto(`/ui/play/note/${NOTE_ID}`);
        await expect(page.getByTestId("player-status")).toHaveText("Abel Tasman – Seite 1/2");

        server.online = false;
        await page.getByRole("button", { name: "Anmerkungen" }).click();
        await draw(page, [0.2, 0.6], [0.8, 0.6]);
        await expect(page.getByTestId("annotation-layer").locator("path")).toHaveCount(1);
        expect(server.puts).toHaveLength(0);

        // Reload while still offline: the edit is still there.
        await page.goto(`/ui/play/note/${NOTE_ID}`);
        await expect(page.getByTestId("annotation-layer").locator("path")).toHaveCount(1);

        // Back online: the queued edit is sent.
        server.online = true;
        await page.evaluate(() => window.dispatchEvent(new Event("online")));
        await expect.poll(() => server.puts.length).toBe(1);
        expect(JSON.parse(server.puts[0].data).strokes).toHaveLength(1);
    });
});
