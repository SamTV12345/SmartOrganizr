import { authFetch } from "@/src/api/client"
import { apiURL } from "@/src/Keycloak"
import { getOfflinePdf } from "@/src/offline/offlineSheetMusic"

// A PDF the play mode can show: a note in the player's own library or a part
// (Stimme) from a club's sheet music archive. Both are addressed by one string
// key, which is also the key of the offline copy.
export type PdfRef =
    | { kind: "note"; noteId: string }
    | { kind: "part"; clubId: string; scoreId: string; partId: string }

const PART_PREFIX = "part:"

/** Stable key; notes keep their bare id so copies saved before parts existed still match. */
export const pdfKey = (ref: PdfRef): string =>
    ref.kind === "note" ? ref.noteId : `${PART_PREFIX}${ref.clubId}:${ref.scoreId}:${ref.partId}`

export const parsePdfKey = (key: string): PdfRef | undefined => {
    if (!key.startsWith(PART_PREFIX)) return key ? { kind: "note", noteId: key } : undefined
    const [clubId, scoreId, partId] = key.slice(PART_PREFIX.length).split(":")
    return clubId && scoreId && partId ? { kind: "part", clubId, scoreId, partId } : undefined
}

const urlFor = (ref: PdfRef): string =>
    ref.kind === "note"
        ? `${apiURL}/v1/elements/${ref.noteId}/pdf`
        : `${apiURL}/v1/clubs/${ref.clubId}/scores/${ref.scoreId}/parts/${ref.partId}/pdf`

/**
 * Downloads a PDF from the server. Note uploads from the web UI are stored as a
 * base64 data URL, older/raw content and club parts are plain PDF bytes — both
 * are returned as a real PDF blob.
 */
export const downloadPdfBlob = async (key: string): Promise<Blob> => {
    const ref = parsePdfKey(key)
    if (!ref) throw new Error(`invalid pdf key ${key}`)
    const response = await authFetch(urlFor(ref))
    if (!response.ok) throw new Error(`status ${response.status}`)
    let blob = await response.blob()
    if ((await blob.slice(0, 5).text()) === "data:") {
        blob = await (await fetch(await blob.text())).blob()
    }
    return new Blob([blob], { type: "application/pdf" })
}

/** @deprecated name kept for callers that only deal with library notes. */
export const downloadNotePdfBlob = (noteId: string) => downloadPdfBlob(noteId)

/**
 * Loads a PDF, preferring a copy saved for offline use: it works without
 * network and opens instantly on stage. Falls back to the server.
 */
export const fetchPdfBlob = async (key: string): Promise<Blob> => {
    try {
        const saved = await getOfflinePdf(key)
        if (saved) return saved.blob
    } catch {
        // IndexedDB unavailable (private mode etc.) — just use the network.
    }
    return downloadPdfBlob(key)
}

export const fetchNotePdfBlob = (noteId: string) => fetchPdfBlob(noteId)
