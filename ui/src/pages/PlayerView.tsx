import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import type { PDFDocumentProxy } from "pdfjs-dist"
import {
    ArrowLeft,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Columns2,
    FileQuestion,
    ListMusic,
    Loader2,
    Maximize,
    Minimize,
    Moon,
    Square,
    Sun,
    X,
} from "lucide-react"
import { PdfPageCanvas } from "@/src/player/PdfPageCanvas"
import { openNotePdf } from "@/src/player/pdfjs"
import { type PlaylistSource, sourceKey, usePlaylist } from "@/src/player/usePlaylist"
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
    const ensureDoc = useCallback((noteId: string | undefined) => {
        if (!noteId || requested.current.has(noteId)) return
        requested.current.add(noteId)
        setDocs((d) => ({ ...d, [noteId]: { status: "loading" } }))
        openNotePdf(noteId).then(
            ({ doc, dispose }) => setDocs((d) => ({ ...d, [noteId]: { status: "ready", doc, dispose } })),
            () => setDocs((d) => ({ ...d, [noteId]: { status: "error" } })),
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
                const state = item.noteId ? docs[item.noteId] : undefined
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
    const currentDoc = current?.noteId ? docs[current.noteId] : undefined

    // Load the current piece and prefetch the next one so the turn into it is instant.
    useEffect(() => {
        const cur = items[position.piece]
        const next = items[position.piece + 1]
        if (cur?.pdfAvailable) ensureDoc(cur.noteId)
        if (next?.pdfAvailable) ensureDoc(next.noteId)
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
        if (!start) return
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
        if (!current.pdfAvailable || !current.noteId || currentDoc?.status === "error") {
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
                        <PdfPageCanvas doc={currentDoc.doc} pageNumber={p} maxWidth={boxWidth} maxHeight={stage.height} />
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
                                        {!item.pdfAvailable && (
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

const CenteredMessage = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 opacity-80">
        {icon}
        <p className="text-lg">{text}</p>
    </div>
)

export default PlayerView
