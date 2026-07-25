import { describe, expect, it } from "vitest";
import { renderQrDataUrl } from "@/src/utils/QrCode";

describe("renderQrDataUrl", () => {
    it("renders a PNG data URL for a tag URL", async () => {
        const dataUrl = await renderQrDataUrl("https://example.org/ui/inventory?tag=abc-123");
        expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
        // A 512px QR is well past a few hundred bytes; guards against an empty canvas.
        expect(dataUrl.length).toBeGreaterThan(500);
    });

    it("returns an empty string for empty input instead of throwing", async () => {
        expect(await renderQrDataUrl("")).toBe("");
        expect(await renderQrDataUrl("   ")).toBe("");
    });
});
