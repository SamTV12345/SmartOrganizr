import { $api } from "@/src/api/client"
import type { NoteDetail } from "@/src/api/types"

export type PlaylistSource =
    | { kind: "note"; noteId: string }
    | { kind: "concert"; concertId: string }
    | { kind: "event"; clubId: string; eventId: string }

export interface PlayItem {
    key: string
    title: string
    /** Free-text hint from the program ("nur 1. Teil", "Solo: Trompete"). */
    hint?: string
    noteId?: string
    pdfAvailable: boolean
    /** Why the program entry resolved to this note (event playlists only). */
    match?: "own" | "wikidata" | "title" | "none"
}

export interface Playlist {
    title: string
    items: PlayItem[]
    isLoading: boolean
    isError: boolean
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

    switch (source.kind) {
        case "note": {
            const current = (note.data as NoteDetail | undefined)?.currentNote
            return {
                title: current?.name ?? "",
                items: current
                    ? [{ key: current.id ?? source.noteId, title: current.name ?? "", noteId: current.id, pdfAvailable: !!current.pdfAvailable }]
                    : [],
                isLoading: note.isLoading,
                isError: note.isError,
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
                    pdfAvailable: !!e.noteInConcert?.pdfAvailable,
                })),
                isLoading: concert.isLoading,
                isError: concert.isError,
            }
        }
        case "event":
            return {
                title: "",
                items: (event.data ?? []).map((e, i) => ({
                    key: e.entryId ?? String(i),
                    title: e.title ?? "",
                    hint: e.noteText ?? undefined,
                    noteId: e.noteId ?? undefined,
                    pdfAvailable: !!e.pdfAvailable,
                    match: e.match,
                })),
                isLoading: event.isLoading,
                isError: event.isError,
            }
    }
}
