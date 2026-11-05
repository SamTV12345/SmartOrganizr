import { $api } from "@/src/api/client"
import type { NoteDetail } from "@/src/api/types"
import { pdfKey } from "./notePdf"

export type PlaylistSource =
    | { kind: "note"; noteId: string }
    | { kind: "concert"; concertId: string }
    | { kind: "event"; clubId: string; eventId: string }

export interface PlayItem {
    key: string
    title: string
    /** Free-text hint from the program ("nur 1. Teil", "Solo: Trompete"). */
    hint?: string
    /** Library note backing this item, if any. */
    noteId?: string
    /** Key of the PDF to show (see notePdf.ts); undefined when there is nothing to show. */
    pdfKey?: string
    pdfAvailable: boolean
    /** Why the program entry resolved to this PDF (event playlists only). */
    match?: "part" | "choosePart" | "own" | "wikidata" | "title" | "none"
    /** Club archive score behind the entry, its club, the member's part and all parts to switch to. */
    clubId?: string
    scoreId?: string
    partId?: string
    partName?: string
    parts?: { id: string; name: string; ownSection: boolean }[]
}

export interface Playlist {
    title: string
    items: PlayItem[]
    isLoading: boolean
    isError: boolean
    /** GET path + raw response, stored as-is when the setlist is saved offline. */
    apiPath: string
    response: unknown
}

export const playlistApiPath = (source: PlaylistSource): string => {
    switch (source.kind) {
        case "note":
            return `/v1/elements/notes/${source.noteId}`
        case "concert":
            return `/v1/concerts/${source.concertId}`
        case "event":
            return `/v1/clubs/${source.clubId}/events/${source.eventId}/program/playlist`
    }
}

export const sourceKey = (source: PlaylistSource): string => {
    switch (source.kind) {
        case "note":
            return `note:${source.noteId}`
        case "concert":
            return `concert:${source.concertId}`
        case "event":
            return `event:${source.clubId}:${source.eventId}`
    }
}

/**
 * Turns any playable source into one ordered list of pieces. All three queries
 * are declared unconditionally (rules of hooks) and only the matching one runs.
 */
export const usePlaylist = (source: PlaylistSource): Playlist => {
    const note = $api.useQuery(
        "get",
        "/v1/elements/notes/{noteId}",
        { params: { path: { noteId: source.kind === "note" ? source.noteId : "" } } },
        { enabled: source.kind === "note" },
    )
    const concert = $api.useQuery(
        "get",
        "/v1/concerts/{concertId}",
        { params: { path: { concertId: source.kind === "concert" ? source.concertId : "" } } },
        { enabled: source.kind === "concert" },
    )
    const event = $api.useQuery(
        "get",
        "/v1/clubs/{clubId}/events/{eventId}/program/playlist",
        {
            params: {
                path: {
                    clubId: source.kind === "event" ? source.clubId : "",
                    eventId: source.kind === "event" ? source.eventId : "",
                },
            },
        },
        { enabled: source.kind === "event" },
    )
    const eventDetail = $api.useQuery(
        "get",
        "/v1/clubs/{clubId}/events/{eventId}",
        {
            params: {
                path: {
                    clubId: source.kind === "event" ? source.clubId : "",
                    eventId: source.kind === "event" ? source.eventId : "",
                },
            },
        },
        { enabled: source.kind === "event", retry: false },
    )

    switch (source.kind) {
        case "note": {
            const current = (note.data as NoteDetail | undefined)?.currentNote
            return {
                title: current?.name ?? "",
                items: current
                    ? [{
                          key: current.id ?? source.noteId,
                          title: current.name ?? "",
                          noteId: current.id,
                          pdfKey: current.id,
                          pdfAvailable: !!current.pdfAvailable,
                      }]
                    : [],
                isLoading: note.isLoading,
                isError: note.isError,
                apiPath: playlistApiPath(source),
                response: note.data,
            }
        }
        case "concert": {
            const entries = [...(concert.data?.noteInConcerts ?? [])].sort(
                (a, b) => (a.placeInConcert ?? 0) - (b.placeInConcert ?? 0),
            )
            return {
                title: concert.data?.title ?? "",
                items: entries.map((e, i) => ({
                    key: `${e.noteInConcert?.id ?? "x"}-${i}`,
                    title: e.noteInConcert?.name ?? "",
                    noteId: e.noteInConcert?.id,
                    pdfKey: e.noteInConcert?.id,
                    pdfAvailable: !!e.noteInConcert?.pdfAvailable,
                })),
                isLoading: concert.isLoading,
                isError: concert.isError,
                apiPath: playlistApiPath(source),
                response: concert.data,
            }
        }
        case "event":
            return {
                title: (eventDetail.data as { summary?: string } | undefined)?.summary ?? "",
                items: (Array.isArray(event.data) ? event.data : []).map((e, i) => ({
                    key: e.entryId ?? String(i),
                    title: e.title ?? "",
                    hint: e.noteText ?? undefined,
                    noteId: e.noteId ?? undefined,
                    pdfKey:
                        e.partId && e.scoreId
                            ? pdfKey({ kind: "part", clubId: source.clubId, scoreId: e.scoreId, partId: e.partId })
                            : (e.noteId ?? undefined),
                    pdfAvailable: !!e.pdfAvailable,
                    match: e.match,
                    clubId: source.clubId,
                    scoreId: e.scoreId ?? undefined,
                    partId: e.partId ?? undefined,
                    partName: e.partName ?? undefined,
                    parts: e.parts?.map((p) => ({ id: p.id ?? "", name: p.name ?? "", ownSection: !!p.ownSection })),
                })),
                isLoading: event.isLoading,
                isError: event.isError,
                apiPath: playlistApiPath(source),
                response: event.data,
            }
    }
}
