import { authFetch } from "@/src/api/client"
import { apiURL } from "@/src/Keycloak"
import { getOfflinePdf } from "@/src/offline/offlineSheetMusic"

/**
 * Downloads the PDF attached to a note as binary. Uploads from the web UI store
 * the PDF as a base64 data URL, older/raw content is plain PDF bytes — both are
 * returned as a real PDF blob.
 */
export const downloadNotePdfBlob = async (noteId: string): Promise<Blob> => {
    const response = await authFetch(`${apiURL}/v1/elements/${noteId}/pdf`)
    if (!response.ok) throw new Error(`status ${response.status}`)
    let blob = await response.blob()
    if ((await blob.slice(0, 5).text()) === "data:") {
        blob = await (await fetch(await blob.text())).blob()
    }
    return new Blob([blob], { type: "application/pdf" })
}

/**
 * Loads a note's PDF, preferring a copy saved for offline use: it works without
 * network and opens instantly on stage. Falls back to the server.
 */
export const fetchNotePdfBlob = async (noteId: string): Promise<Blob> => {
    try {
        const saved = await getOfflinePdf(noteId)
        if (saved) return saved.blob
    } catch {
        // IndexedDB unavailable (private mode etc.) — just use the network.
    }
    return downloadNotePdfBlob(noteId)
}
