// Phone photos are typically 3-10 MB which is overkill for AI identification —
// the vision models downscale internally anyway, and the upload is wasted
// bandwidth + base64 inflates by ~33%. Resize client-side to a max edge of
// 1600px and re-encode as JPEG quality 0.85 before sending.

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;

export async function compressImageForAI(file: File): Promise<{ base64: string; mimeType: string }> {
    const bitmap = await createImageBitmap(file);
    try {
        const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
        const w = Math.round(bitmap.width * scale);
        const h = Math.round(bitmap.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("2d context unavailable");
        ctx.drawImage(bitmap, 0, 0, w, h);

        const blob: Blob = await new Promise((resolve, reject) =>
            canvas.toBlob(
                (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
                "image/jpeg",
                JPEG_QUALITY,
            ),
        );
        const base64 = await blobToBase64(blob);
        return { base64, mimeType: "image/jpeg" };
    } finally {
        bitmap.close?.();
    }
}

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result ?? "");
            // result is a data URL: "data:image/jpeg;base64,XXXXX". Strip the prefix.
            const i = result.indexOf("base64,");
            resolve(i >= 0 ? result.slice(i + "base64,".length) : result);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}
