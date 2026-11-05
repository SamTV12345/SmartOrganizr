import { useCallback, useEffect, useState } from "react"
import { apiFetch } from "@/src/api/client"
import { flushPendingAnnotations, loadAnnotations, saveAnnotationPage, type FetchRemote, type PutRemote } from "@/src/offline/annotationStore"
import { parsePage, serializePage, type PageAnnotations } from "./annotations"

export const fetchAnnotationsRemote: FetchRemote = async (key) => {
    const { data, error } = await apiFetch.GET("/v1/annotations", { params: { query: { key } } })
    if (error || !data) throw new Error("annotations unavailable")
    return (data.pages ?? []).map((p) => ({ page: p.page ?? 0, data: p.data ?? "" }))
}

export const putAnnotationRemote: PutRemote = async (key, page, data) => {
    const { response } = await apiFetch.PUT("/v1/annotations/page", { body: { key, page, data } })
    if (!response.ok) throw new Error(`status ${response.status}`)
}

/** Sends edits made offline as soon as the connection is back. */
const useFlushOnReconnect = () => {
    useEffect(() => {
        const flush = () => void flushPendingAnnotations(putAnnotationRemote).catch(() => undefined)
        flush()
        window.addEventListener("online", flush)
        return () => window.removeEventListener("online", flush)
    }, [])
}

/** Annotations of one PDF (all pages), with optimistic, offline-safe saving. */
export const useAnnotations = (pdfKey: string | undefined) => {
    const [pages, setPages] = useState<Record<number, PageAnnotations>>({})
    useFlushOnReconnect()

    useEffect(() => {
        setPages({})
        if (!pdfKey) return
        let cancelled = false
        loadAnnotations(pdfKey, fetchAnnotationsRemote).then(
            (raw) => {
                if (cancelled) return
                const parsed: Record<number, PageAnnotations> = {}
                for (const [page, json] of Object.entries(raw)) parsed[Number(page)] = parsePage(json)
                setPages(parsed)
            },
            () => undefined,
        )
        return () => {
            cancelled = true
        }
    }, [pdfKey])

    const setPage = useCallback(
        (page: number, doc: PageAnnotations) => {
            if (!pdfKey) return
            setPages((all) => ({ ...all, [page]: doc }))
            void saveAnnotationPage(pdfKey, page, serializePage(doc), putAnnotationRemote).catch(() => undefined)
        },
        [pdfKey],
    )

    return { pages, setPage }
}
