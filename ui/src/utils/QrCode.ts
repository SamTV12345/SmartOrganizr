// QR rendering for the Mappe tag. The inventory spec promises the tag URL "+ QR
// to print": at Mappe size (5x5 cm on the cover) QR scanning is reliable, and a
// printed QR is the free alternative to an NFC sticker.
//
// The qrcode library is imported lazily, like tesseract.js, so it stays out of
// the main bundle for everyone who never binds a tag.

const QR_PIXEL_SIZE = 512;

/** Renders text as a PNG data URL, or "" for blank input. */
export const renderQrDataUrl = async (text: string): Promise<string> => {
    if (text.trim() === "") return "";
    const qrcode = await import("qrcode");
    const toDataURL = qrcode.toDataURL ?? qrcode.default?.toDataURL;
    if (!toDataURL) throw new Error("QR renderer is not available.");
    return await toDataURL(text, { width: QR_PIXEL_SIZE, margin: 1 });
};

/**
 * Opens a print window with nothing but the QR and its caption, sized to the
 * 5 cm the spec calls for. Returns false when the browser blocked the popup, so
 * callers can tell the user instead of failing silently.
 */
export const printQrCode = (dataUrl: string, caption: string): boolean => {
    const printWindow = window.open("", "_blank", "width=420,height=560");
    if (!printWindow) return false;
    printWindow.document.write(`<!doctype html>
<html>
<head>
<title>${escapeHtml(caption)}</title>
<style>
  @page { margin: 1cm; }
  body { margin: 0; font-family: system-ui, sans-serif; text-align: center; }
  img { width: 5cm; height: 5cm; display: block; margin: 0 auto; }
  p { margin: 0.4cm 0 0; font-size: 12pt; }
</style>
</head>
<body>
  <img src="${dataUrl}" alt="">
  <p>${escapeHtml(caption)}</p>
</body>
</html>`);
    printWindow.document.close();
    // Give the image a tick to decode before the print dialog snapshots the page.
    printWindow.addEventListener("load", () => printWindow.print());
    return true;
};

const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, (char) => {
        switch (char) {
            case "&":
                return "&amp;";
            case "<":
                return "&lt;";
            case ">":
                return "&gt;";
            case '"':
                return "&quot;";
            default:
                return "&#39;";
        }
    });
