import type { PDFDocumentProxy } from "pdfjs-dist"
import { fetchPdfBlob } from "./notePdf"

type PdfJs = typeof import("pdfjs-dist")

let pdfjsPromise: Promise<PdfJs> | undefined

/** pdf.js is large, so it is only loaded when the play mode opens. */
export const loadPdfjs = (): Promise<PdfJs> => {
    pdfjsPromise ??= import("pdfjs-dist").then((pdfjs) => {
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
            pdfjs.GlobalWorkerOptions.workerSrc = new URL(
                "pdfjs-dist/build/pdf.worker.min.mjs",
                import.meta.url,
            ).toString()
        }
        return pdfjs
    })
    return pdfjsPromise
}

export interface OpenedPdf {
    doc: PDFDocumentProxy
    /** Releases the document and its worker resources. */
    dispose: () => void
}

/** Loads a PDF by key (note or club part, offline copy first) and opens it with pdf.js. */
export const openPdf = async (key: string): Promise<OpenedPdf> => {
    const [pdfjs, blob] = await Promise.all([loadPdfjs(), fetchPdfBlob(key)])
    const data = new Uint8Array(await blob.arrayBuffer())
    const task = pdfjs.getDocument({ data })
    const doc = await task.promise
    return { doc, dispose: () => void task.destroy().catch(() => undefined) }
}

/**
 * Fetches the pdf.js bundle and worker once so the service worker caches them:
 * a setlist saved for offline use must also be renderable without network.
 */
export const warmPdfjsForOffline = async (): Promise<void> => {
    const pdfjs = await loadPdfjs()
    await fetch(pdfjs.GlobalWorkerOptions.workerSrc).catch(() => undefined)
}
