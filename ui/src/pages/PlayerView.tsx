import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import type { PDFDocumentProxy } from "pdfjs-dist"
import {
    ArrowLeft,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    CloudCheck,
    CloudDownload,
    Columns2,
    FileQuestion,
    ListMusic,
    Loader2,
    Maximize,
    Music2,
    Minimize,
    Moon,
    Eraser,
    Highlighter,
    PenLine,
    Type,
    Undo2,
    Square,
    Sun,
    X,
} from "lucide-react"
import { PdfPageCanvas } from "@/src/player/PdfPageCanvas"
import { openPdf } from "@/src/player/pdfjs"
import { type PlaylistSource, sourceKey, usePlaylist } from "@/src/player/usePlaylist"
import { useOfflineSetlist } from "@/src/player/useOfflineSetlist"
import { useAnnotations } from "@/src/player/useAnnotations"
import { AnnotationLayer } from "@/src/player/AnnotationLayer"
import { emptyPage, PEN_COLORS, type PageAnnotations, type Tool } from "@/src/player/annotations"
import { formatBytes } from "@/src/utils/formatBytes"
import { $api } from "@/src/api/client"
import { useQueryClient } from "@tanstack/react-query"
import {
    autoSpread,
    clampPosition,
    effectivePages,
    keyAction,
    type NavAction,
    nextPosition,
    type PlayerPosition,
    prevPosition,
    progress,
    type Spread,
    swipeAction,
    tapZone,
    visiblePages,
} from "@/src/player/playerNav"

type SpreadMode = "auto" | Spread

interface PlayerPrefs {
    spreadMode: SpreadMode
    night: boolean
}

// localStorage can be unavailable (private mode, embedded webviews): every
// access is guarded and the player simply forgets instead of failing.
const readStorage = <T,>(key: string, fallback: T): T => {
    try {
        const raw = window.localStorage.getItem(key)
        return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
    } catch {
        return fallback
    }
}
const writeStorage = (key: string, value: unknown) => {
    try {
        window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
        /* ignore */
    }
}

const PREFS_KEY = "smartorganizr.player.prefs"
const positionKey = (source: PlaylistSource) => `smartorganizr.player.pos.${sourceKey(source)}`

const useSource = (): PlaylistSource | undefined => {
    const { kind, id, eventId } = useParams()
    if (kind === "note" && id) return { kind: "note", noteId: id }
    if (kind === "concert" && id) return { kind: "concert", concertId: id }
    if (kind === "event" && id && eventId) return { kind: "event", clubId: id, eventId }
    return undefined
}

/** Keeps the screen on while playing — a sleeping tablet mid-piece is the worst case. */
const useWakeLock = () => {
    useEffect(() => {
        type Sentinel = { release: () => Promise<void> }
        const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<Sentinel> } }
        let sentinel: Sentinel | undefined
        const acquire = async () => {
            try {
                sentinel = await nav.wakeLock?.request("screen")
            } catch {
                /* unsupported or denied — the player still works */
            }
        }
        const onVisible = () => {
            if (document.visibilityState === "visible") void acquire()
        }
        void acquire()
        document.addEventListener("visibilitychange", onVisible)
        return () => {
            document.removeEventListener("visibilitychange", onVisible)
            void sentinel?.release().catch(() => undefined)
        }
    }, [])
}

/** Measures the stage so pages can be fitted exactly. */
const useElementSize = <T extends HTMLElement>() => {
    const ref = useRef<T>(null)
    const [size, setSize] = useState({ width: 0, height: 0 })
    useEffect(() => {
        const el = ref.current
        if (!el) return
        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect
            setSize({ width: Math.floor(width), height: Math.floor(height) })
        })
        observer.observe(el)
        return () => observer.disconnect()
    }, [])
    return [ref, size] as const
}

type DocState = { status: "loading" } | { status: "ready"; doc: PDFDocumentProxy; dispose: () => void } | { status: "error" }

export const PlayerView = () => {
    const source = useSource()
    if (!source) return null
    return <Player source={source} key={sourceKey(source)} />
}

const Player = ({ source }: { source: PlaylistSource }) => {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const playlist = usePlaylist(source)
    const items = playlist.items
    const offline = useOfflineSetlist(sourceKey(source), playlist)
    const [offlinePanelOpen, setOfflinePanelOpen] = useState(false)
    const [partsPanelOpen, setPartsPanelOpen] = useState(false)

    // Switching parts (1. ↔ 2. Klarinette) is remembered server-side per score.
    // A setlist saved offline is re-saved afterwards so it carries the new part.
    const queryClient = useQueryClient()
    const resaveOffline = useRef(false)
    const choosePart = $api.useMutation("put", "/v1/clubs/{clubId}/scores/{scoreId}/choice", {
        onSuccess: async () => {
            resaveOffline.current = offline.state.status === "saved"
            await queryClient.invalidateQueries({ queryKey: ["get", "/v1/clubs/{clubId}/events/{eventId}/program/playlist"] })
        },
    })
    useEffect(() => {
        if (resaveOffline.current && playlist.response !== undefined) {
            resaveOffline.current = false
            void offline.save()
        }
    }, [playlist.response, offline])
    const selectPart = (item: { clubId?: string; scoreId?: string }, partId: string) => {
        if (!item.clubId || !item.scoreId) return
        setPartsPanelOpen(false)
        choosePart.mutate({ params: { path: { clubId: item.clubId, scoreId: item.scoreId } }, body: { partId } })
    }
    useWakeLock()

    const [prefs, setPrefs] = useState<PlayerPrefs>(() =>
        readStorage<PlayerPrefs>(PREFS_KEY, { spreadMode: "auto", night: false }),
    )
    useEffect(() => writeStorage(PREFS_KEY, prefs), [prefs])

    const [stageRef, stage] = useElementSize<HTMLDivElement>()
    const spread: Spread = prefs.spreadMode === "auto" ? autoSpread(stage.width, stage.height) : prefs.spreadMode

    // Loaded PDFs per note id; `requested` prevents double downloads during prefetch.
    const [docs, setDocs] = useState<Record<string, DocState>>({})
    const requested = useRef(new Set<string>())
    const ensureDoc = useCallback((key: string | undefined) => {
        if (!key || requested.current.has(key)) return
        requested.current.add(key)
        setDocs((d) => ({ ...d, [key]: { status: "loading" } }))
        openPdf(key).then(
            ({ doc, dispose }) => setDocs((d) => ({ ...d, [key]: { status: "ready", doc, dispose } })),
            () => setDocs((d) => ({ ...d, [key]: { status: "error" } })),
        )
    }, [])
    // Free pdf.js workers/memory for every document when the player closes.
    const docsRef = useRef(docs)
    docsRef.current = docs
    useEffect(
        () => () => {
            Object.values(docsRef.current).forEach((s) => {
                if (s.status === "ready") s.dispose()
            })
        },
        [],
    )

    const pageCounts = useMemo(
        () =>
            items.map((item) => {
                const state = item.pdfKey ? docs[item.pdfKey] : undefined
                return state?.status === "ready" ? state.doc.numPages : 1
            }),
        [items, docs],
    )

    const [rawPosition, setRawPosition] = useState<PlayerPosition>(() => {
        const start = Number(searchParams.get("start"))
        if (Number.isInteger(start) && start > 0) return { piece: start - 1, page: 1 }
        return readStorage<PlayerPosition>(positionKey(source), { piece: 0, page: 1 })
    })
    const position = clampPosition(rawPosition, pageCounts, spread)
    useEffect(() => writeStorage(positionKey(source), position), [source, position.piece, position.page])

    const current = items[position.piece]
    const currentDoc = current?.pdfKey ? docs[current.pdfKey] : undefined

    // Annotations (pen, highlighter, text) of the current piece. While editing,
    // taps draw instead of turning pages; pedals and keys still turn pages.
    const annotations = useAnnotations(current?.pdfKey)
    const [annotating, setAnnotating] = useState(false)
    const [tool, setTool] = useState<Tool>("pen")
    const [penColor, setPenColor] = useState<string>(PEN_COLORS[0])
    const [undoStack, setUndoStack] = useState<{ pdfKey: string; page: number; prev: PageAnnotations }[]>([])
    const changePage = (page: number, next: PageAnnotations) => {
        if (!current?.pdfKey) return
        setUndoStack((s) => [...s.slice(-49), { pdfKey: current.pdfKey!, page, prev: annotations.pages[page] ?? emptyPage() }])
        annotations.setPage(page, next)
    }
    const undo = () => {
        const last = undoStack[undoStack.length - 1]
        if (!last || last.pdfKey !== current?.pdfKey) return
        setUndoStack((s) => s.slice(0, -1))
        annotations.setPage(last.page, last.prev)
    }
    // Undo history belongs to one piece.
    useEffect(() => setUndoStack([]), [current?.pdfKey])

    // Load the current piece and prefetch the next one so the turn into it is instant.
    useEffect(() => {
        const cur = items[position.piece]
        const next = items[position.piece + 1]
        if (cur?.pdfAvailable) ensureDoc(cur.pdfKey)
        if (next?.pdfAvailable) ensureDoc(next.pdfKey)
    }, [items, position.piece, ensureDoc])

    const [menuOpen, setMenuOpen] = useState(true)
    const [setlistOpen, setSetlistOpen] = useState(false)
    const [atEnd, setAtEnd] = useState(false)

    // Show the toolbar briefly on start, then get out of the way.
    useEffect(() => {
        const timer = window.setTimeout(() => setMenuOpen(false), 2500)
        return () => window.clearTimeout(timer)
    }, [])

    const go = useCallback(
        (action: NavAction) => {
            const target = action === "next" ? nextPosition(position, pageCounts, spread) : prevPosition(position, pageCounts, spread)
            if (target) {
                setRawPosition(target)
                setAtEnd(false)
            } else if (action === "next") {
                setAtEnd(true)
            }
        },
        [position, pageCounts, spread],
    )

    const jumpTo = (piece: number) => {
        setRawPosition({ piece, page: 1 })
        setAtEnd(false)
        setSetlistOpen(false)
    }

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null
            if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return
            if (e.key === "Escape") {
                if (setlistOpen) setSetlistOpen(false)
                else setMenuOpen((m) => !m)
                return
            }
            const action = keyAction(e.key)
            if (!action || e.repeat) return
            e.preventDefault()
            go(action)
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [go, setlistOpen])

    const pointerStart = useRef<{ x: number; y: number } | null>(null)
    const onPointerDown = (e: React.PointerEvent) => {
        pointerStart.current = { x: e.clientX, y: e.clientY }
    }
    const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        const start = pointerStart.current
        pointerStart.current = null
        if (!start || annotating) return
        const dx = e.clientX - start.x
        const dy = e.clientY - start.y
        if (Math.hypot(dx, dy) > 20) {
            const swipe = swipeAction(dx, dy)
            if (swipe) go(swipe)
            return
        }
        const rect = e.currentTarget.getBoundingClientRect()
        const zone = tapZone(e.clientX - rect.left, rect.width)
        if (zone === "menu") setMenuOpen((m) => !m)
        else go(zone)
    }

    const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement)
    useEffect(() => {
        const onChange = () => setIsFullscreen(!!document.fullscreenElement)
        document.addEventListener("fullscreenchange", onChange)
        return () => document.removeEventListener("fullscreenchange", onChange)
    }, [])
    const toggleFullscreen = () => {
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
        else void document.documentElement.requestFullscreen?.().catch(() => undefined)
    }

    const close = () => {
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
        if (window.history.length > 1) navigate(-1)
        else navigate("/dashboard")
    }

    const cycleSpread = () =>
        setPrefs((p) => ({ ...p, spreadMode: p.spreadMode === "auto" ? 1 : p.spreadMode === 1 ? 2 : "auto" }))

    const pagesNow = current ? visiblePages(position, pageCounts[position.piece], spread) : []
    const pageTotal = effectivePages(pageCounts[position.piece])
    const title = playlist.title || (source.kind === "event" ? t("player.eventProgram") : t("player.title"))

    const statusText = current
        ? [
              items.length > 1 ? t("player.pieceOf", { current: position.piece + 1, total: items.length }) : "",
              pagesNow.length > 1
                  ? t("player.pagesOf", { from: pagesNow[0], to: pagesNow[pagesNow.length - 1], total: pageTotal })
                  : t("player.pageOf", { current: position.page, total: pageTotal }),
          ]
              .filter(Boolean)
              .join(" · ")
        : ""

    const surface = prefs.night ? "bg-neutral-950 text-neutral-100" : "bg-neutral-200 text-neutral-900"
    const pageFilter = prefs.night ? { filter: "invert(1) hue-rotate(180deg)" } : undefined

    const renderStage = () => {
        if (playlist.isLoading) return <CenteredMessage icon={<Loader2 className="h-8 w-8 animate-spin" />} text={t("player.loading")} />
        if (playlist.isError) return <CenteredMessage icon={<FileQuestion className="h-10 w-10" />} text={t("player.loadFailed")} />
        if (!current) return <CenteredMessage icon={<ListMusic className="h-10 w-10" />} text={t("player.empty")} />
        if (current.match === "choosePart" && current.parts?.length) {
            return (
                <div className="flex h-full w-full items-center justify-center p-6">
                    <div
                        className="max-w-md rounded-xl border bg-background p-8 text-center text-foreground shadow-lg"
                        onPointerDown={(e) => e.stopPropagation()}
                        onPointerUp={(e) => e.stopPropagation()}
                    >
                        <Music2 className="mx-auto mb-4 h-10 w-10 opacity-70" />
                        <h2 className="mb-2 text-2xl font-semibold">{current.title}</h2>
                        <p className="mb-4 text-sm text-muted-foreground">{t("player.parts.chooseHint")}</p>
                        <div className="flex flex-col gap-2">
                            {current.parts.map((part) => (
                                <button
                                    key={part.id}
                                    type="button"
                                    className="rounded-md border px-4 py-2 hover:bg-muted disabled:opacity-50"
                                    disabled={choosePart.isPending}
                                    onClick={() => selectPart(current, part.id)}
                                >
                                    {part.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )
        }
        if (!current.pdfAvailable || !current.pdfKey || currentDoc?.status === "error") {
            return (
                <div className="flex h-full w-full items-center justify-center p-6">
                    <div className="max-w-md rounded-xl border border-current/20 bg-background/80 p-8 text-center text-foreground shadow-lg">
                        <FileQuestion className="mx-auto mb-4 h-10 w-10 opacity-70" />
                        <h2 className="mb-2 text-2xl font-semibold">{current.title}</h2>
                        {current.hint && <p className="mb-3 italic opacity-80">{current.hint}</p>}
                        <p className="text-sm opacity-70">
                            {currentDoc?.status === "error"
                                ? t("player.pdfFailed")
                                : current.noteId
                                  ? t("player.noPdf")
                                  : t("player.notInLibrary")}
                        </p>
                    </div>
                </div>
            )
        }
        if (!currentDoc || currentDoc.status === "loading") {
            return <CenteredMessage icon={<Loader2 className="h-8 w-8 animate-spin" />} text={current.title} />
        }
        const gap = 8
        const boxWidth = (stage.width - gap * (pagesNow.length - 1)) / spread
        return (
            <div className="flex h-full w-full items-center justify-center" style={{ gap }}>
                {pagesNow.map((p) => (
                    <div key={p} style={pageFilter}>
                        <PdfPageCanvas
                            doc={currentDoc.doc}
                            pageNumber={p}
                            maxWidth={boxWidth}
                            maxHeight={stage.height}
                            overlay={(size) => (
                                <AnnotationLayer
                                    doc={annotations.pages[p] ?? emptyPage()}
                                    width={size.width}
                                    height={size.height}
                                    editing={annotating}
                                    tool={tool}
                                    color={penColor}
                                    onChange={(next) => changePage(p, next)}
                                    textPlaceholder={t("player.annotate.textPlaceholder")}
                                />
                            )}
                        />
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className={`fixed inset-0 z-50 flex select-none flex-col ${surface}`}>
            <div
                ref={stageRef}
                className="relative min-h-0 flex-1 touch-none overflow-hidden"
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                onPointerCancel={() => (pointerStart.current = null)}
                role="application"
                aria-label={t("player.stageLabel")}
            >
                {renderStage()}
                {atEnd && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-10 flex justify-center">
                        <span className="rounded-full bg-black/70 px-4 py-2 text-sm text-white">{t("player.end")}</span>
                    </div>
                )}
            </div>

            <div className="sr-only" aria-live="polite" data-testid="player-status">
                {current ? `${current.title} – ${statusText}` : ""}
            </div>

            {annotating && currentDoc?.status === "ready" && (
                <div
                    className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border bg-background/95 px-2 py-1 text-foreground shadow-xl backdrop-blur"
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                    data-testid="annotation-palette"
                >
                    {PEN_COLORS.map((c, i) => (
                        <button
                            key={c}
                            type="button"
                            title={t(`player.annotate.pen${i}`)}
                            aria-label={t(`player.annotate.pen${i}`)}
                            aria-pressed={tool === "pen" && penColor === c}
                            onClick={() => {
                                setTool("pen")
                                setPenColor(c)
                            }}
                            className={`flex h-10 w-10 items-center justify-center rounded-full ${tool === "pen" && penColor === c ? "bg-muted ring-2 ring-primary" : "hover:bg-muted"}`}
                        >
                            <span className="h-5 w-5 rounded-full border" style={{ background: c }} />
                        </button>
                    ))}
                    {(
                        [
                            ["highlighter", Highlighter],
                            ["text", Type],
                            ["eraser", Eraser],
                        ] as const
                    ).map(([id, Icon]) => (
                        <button
                            key={id}
                            type="button"
                            title={t(`player.annotate.${id}`)}
                            aria-label={t(`player.annotate.${id}`)}
                            aria-pressed={tool === id}
                            onClick={() => setTool(id)}
                            className={`flex h-10 w-10 items-center justify-center rounded-full ${tool === id ? "bg-muted ring-2 ring-primary" : "hover:bg-muted"}`}
                        >
                            <Icon className="h-5 w-5" />
                        </button>
                    ))}
                    <button
                        type="button"
                        title={t("player.annotate.undo")}
                        aria-label={t("player.annotate.undo")}
                        disabled={!undoStack.some((u) => u.pdfKey === current?.pdfKey)}
                        onClick={undo}
                        className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted disabled:opacity-40"
                    >
                        <Undo2 className="h-5 w-5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setAnnotating(false)}
                        className="ml-1 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                    >
                        {t("player.annotate.done")}
                    </button>
                </div>
            )}

            {/* Progress through the whole setlist — always visible, never in the way. */}
            <div className="h-1 w-full bg-black/10">
                <div className="h-full bg-primary transition-[width]" style={{ width: `${progress(position, pageCounts) * 100}%` }} />
            </div>

            {/* Without a piece on screen there is nothing to tap through — keep the way out visible. */}
            {(menuOpen || !current) && (
                <div
                    className="absolute inset-x-0 top-0 flex items-center gap-2 bg-background/95 px-3 py-2 text-foreground shadow-md backdrop-blur"
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                >
                    <ToolbarButton label={t("player.close")} onClick={close}>
                        <ArrowLeft className="h-5 w-5" />
                    </ToolbarButton>
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{current?.title || title}</div>
                        <div className="truncate text-xs text-muted-foreground">{statusText}</div>
                    </div>
                    <ToolbarButton label={t("player.previous")} onClick={() => go("prev")}>
                        <ChevronLeft className="h-5 w-5" />
                    </ToolbarButton>
                    <ToolbarButton label={t("player.next")} onClick={() => go("next")}>
                        <ChevronRight className="h-5 w-5" />
                    </ToolbarButton>
                    <ToolbarButton
                        label={t(prefs.spreadMode === "auto" ? "player.spreadAuto" : prefs.spreadMode === 1 ? "player.spreadSingle" : "player.spreadDouble")}
                        onClick={cycleSpread}
                    >
                        {prefs.spreadMode === "auto" ? <BookOpen className="h-5 w-5" /> : prefs.spreadMode === 1 ? <Square className="h-5 w-5" /> : <Columns2 className="h-5 w-5" />}
                    </ToolbarButton>
                    <ToolbarButton label={t(prefs.night ? "player.dayMode" : "player.nightMode")} onClick={() => setPrefs((p) => ({ ...p, night: !p.night }))}>
                        {prefs.night ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </ToolbarButton>
                    {current?.parts && current.parts.length > 1 && current.partId && (
                        <button
                            type="button"
                            onClick={() => setPartsPanelOpen((o) => !o)}
                            className="inline-flex h-10 max-w-40 shrink-0 items-center gap-1 rounded-md px-2 text-sm hover:bg-muted"
                            title={t("player.parts.switch")}
                            aria-label={t("player.parts.switch")}
                        >
                            <Music2 className="h-4 w-4 shrink-0" />
                            <span className="truncate">{current.partName}</span>
                        </button>
                    )}
                    {currentDoc?.status === "ready" && (
                        <ToolbarButton
                            label={t("player.annotate.toggle")}
                            onClick={() => {
                                setAnnotating((a) => !a)
                                setMenuOpen(false)
                            }}
                        >
                            <PenLine className={`h-5 w-5 ${annotating ? "text-primary" : ""}`} />
                        </ToolbarButton>
                    )}
                    {items.some((i) => i.pdfAvailable) && (
                        <OfflineButton
                            state={offline.state}
                            onSave={() => void offline.save()}
                            onToggleDetails={() => setOfflinePanelOpen((o) => !o)}
                        />
                    )}
                    {items.length > 1 && (
                        <ToolbarButton label={t("player.setlist")} onClick={() => setSetlistOpen((o) => !o)}>
                            <ListMusic className="h-5 w-5" />
                        </ToolbarButton>
                    )}
                    {document.fullscreenEnabled && (
                        <ToolbarButton label={t(isFullscreen ? "player.exitFullscreen" : "player.fullscreen")} onClick={toggleFullscreen}>
                            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                        </ToolbarButton>
                    )}
                </div>
            )}

            {partsPanelOpen && current?.parts && (
                <div
                    className="absolute right-3 top-14 w-72 rounded-lg border bg-background p-2 text-sm text-foreground shadow-xl"
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                    data-testid="parts-panel"
                >
                    <p className="px-2 py-1 font-semibold">{t("player.parts.switch")}</p>
                    {current.parts.map((part) => (
                        <button
                            key={part.id}
                            type="button"
                            onClick={() => selectPart(current, part.id)}
                            className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-muted ${part.id === current.partId ? "font-semibold" : ""}`}
                        >
                            <span>{part.name}</span>
                            {part.ownSection && <span className="text-xs text-muted-foreground">{t("player.parts.ownSection")}</span>}
                        </button>
                    ))}
                </div>
            )}

            {offlinePanelOpen && offline.state.status === "saved" && (
                <div
                    className="absolute right-3 top-14 w-72 rounded-lg border bg-background p-4 text-sm text-foreground shadow-xl"
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                    data-testid="offline-panel"
                >
                    <p className="font-semibold">{t("player.offline.saved")}</p>
                    <p className="mt-1 text-muted-foreground">
                        {t("player.offline.details", {
                            count: offline.state.setlist.noteIds.length,
                            size: formatBytes(offline.state.setlist.bytes),
                        })}
                    </p>
                    <div className="mt-3 flex gap-2">
                        <button type="button" className="rounded-md border px-3 py-1.5 hover:bg-muted" onClick={() => void offline.save()}>
                            {t("player.offline.update")}
                        </button>
                        <button
                            type="button"
                            className="rounded-md border px-3 py-1.5 text-red-600 hover:bg-muted"
                            onClick={() => {
                                void offline.remove()
                                setOfflinePanelOpen(false)
                            }}
                        >
                            {t("player.offline.remove")}
                        </button>
                    </div>
                </div>
            )}

            {setlistOpen && (
                <div
                    className="absolute inset-y-0 right-0 flex w-80 max-w-[85vw] flex-col bg-background text-foreground shadow-2xl"
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between border-b px-4 py-3">
                        <h2 className="font-semibold">{t("player.setlist")}</h2>
                        <ToolbarButton label={t("player.close")} onClick={() => setSetlistOpen(false)}>
                            <X className="h-5 w-5" />
                        </ToolbarButton>
                    </div>
                    <ol className="flex-1 overflow-auto py-2">
                        {items.map((item, i) => (
                            <li key={item.key}>
                                <button
                                    type="button"
                                    onClick={() => jumpTo(i)}
                                    className={`flex w-full items-start gap-3 px-4 py-2 text-left hover:bg-muted ${i === position.piece ? "bg-muted font-semibold" : ""}`}
                                >
                                    <span className="w-6 shrink-0 text-right text-sm text-muted-foreground">{i + 1}.</span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate">{item.title}</span>
                                        {item.hint && <span className="block truncate text-xs italic text-muted-foreground">{item.hint}</span>}
                                        {item.partName && <span className="block text-xs text-muted-foreground">{item.partName}</span>}
                                        {!item.pdfAvailable && item.match !== "choosePart" && (
                                            <span className="block text-xs text-muted-foreground">
                                                {item.noteId ? t("player.noPdfShort") : t("player.notInLibraryShort")}
                                            </span>
                                        )}
                                        {item.match === "title" || item.match === "wikidata" ? (
                                            <span className="block text-xs text-muted-foreground">{t(`player.match.${item.match}`)}</span>
                                        ) : null}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </div>
    )
}

const ToolbarButton = ({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) => (
    <button
        type="button"
        title={label}
        aria-label={label}
        onClick={onClick}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
        {children}
    </button>
)

const OfflineButton = ({
    state,
    onSave,
    onToggleDetails,
}: {
    state: ReturnType<typeof useOfflineSetlist>["state"]
    onSave: () => void
    onToggleDetails: () => void
}) => {
    const { t } = useTranslation()
    if (state.status === "saving") {
        return (
            <span className="inline-flex h-10 shrink-0 items-center gap-1 px-2 text-xs" role="status">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("player.offline.saving", { done: state.done, total: state.total })}
            </span>
        )
    }
    if (state.status === "saved") {
        return (
            <ToolbarButton label={t("player.offline.saved")} onClick={onToggleDetails}>
                <CloudCheck className="h-5 w-5 text-green-600" />
            </ToolbarButton>
        )
    }
    if (state.status === "unknown") return null
    return (
        <ToolbarButton label={t(state.status === "error" ? "player.offline.failed" : "player.offline.save")} onClick={onSave}>
            <CloudDownload className={`h-5 w-5 ${state.status === "error" ? "text-red-600" : ""}`} />
        </ToolbarButton>
    )
}

const CenteredMessage = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 opacity-80">
        {icon}
        <p className="text-lg">{text}</p>
    </div>
)

export default PlayerView
