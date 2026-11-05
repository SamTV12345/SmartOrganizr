import { useCallback, useEffect, useState } from "react"
import {
    getOfflineSetlist,
    removeSetlistOffline,
    saveSetlistOffline,
    type OfflineSetlist,
} from "@/src/offline/offlineSheetMusic"
import { downloadPdfBlob } from "./notePdf"
import { warmPdfjsForOffline } from "./pdfjs"
import type { Playlist } from "./usePlaylist"

export type OfflineState =
    | { status: "unknown" }
    | { status: "none" }
    | { status: "saving"; done: number; total: number }
    | { status: "saved"; setlist: OfflineSetlist }
    | { status: "error" }

/** Offline availability of one setlist plus save/remove actions for the player toolbar. */
export const useOfflineSetlist = (key: string, playlist: Playlist) => {
    const [state, setState] = useState<OfflineState>({ status: "unknown" })

    useEffect(() => {
        let cancelled = false
        getOfflineSetlist(key).then(
            (setlist) => !cancelled && setState(setlist ? { status: "saved", setlist } : { status: "none" }),
            () => !cancelled && setState({ status: "none" }),
        )
        return () => {
            cancelled = true
        }
    }, [key])

    const save = useCallback(async () => {
        if (playlist.response === undefined) return
        // Field name is historical: the store holds PDF keys (notes and club parts).
        const noteIds = playlist.items.filter((i) => i.pdfAvailable && i.pdfKey).map((i) => i.pdfKey!)
        try {
            await warmPdfjsForOffline()
            const setlist = await saveSetlistOffline(
                { key, title: playlist.title || playlist.items[0]?.title || "", apiPath: playlist.apiPath, response: playlist.response, noteIds },
                downloadPdfBlob,
                (done, total) => setState({ status: "saving", done, total }),
            )
            setState({ status: "saved", setlist })
        } catch {
            setState({ status: "error" })
        }
    }, [key, playlist])

    const remove = useCallback(async () => {
        await removeSetlistOffline(key).catch(() => undefined)
        setState({ status: "none" })
    }, [key])

    return { state, save, remove }
}
