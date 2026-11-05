// Pure navigation logic for the play mode. Kept free of React and pdf.js so it
// can be tested in isolation.
//
// A setlist is a list of pieces, each with a page count. The position points at
// the first page of the visible spread (1-based); with spread=2 the viewer
// shows pages 1–2, 3–4, ... side by side.

export type Spread = 1 | 2

export interface PlayerPosition {
    piece: number
    page: number
}

export type NavAction = "next" | "prev"

/** Pieces without a (loaded) PDF still occupy one "page": a placeholder card. */
export const effectivePages = (pageCount: number | undefined): number =>
    Math.max(1, Math.floor(pageCount ?? 1))

/** First page of the spread that contains `page`. */
export const spreadStart = (page: number, spread: Spread): number =>
    1 + Math.floor((Math.max(1, page) - 1) / spread) * spread

/** First page of the last spread of a piece. */
export const lastSpreadStart = (pageCount: number, spread: Spread): number =>
    spreadStart(effectivePages(pageCount), spread)

export const clampPosition = (
    pos: PlayerPosition,
    pageCounts: number[],
    spread: Spread,
): PlayerPosition => {
    if (pageCounts.length === 0) return { piece: 0, page: 1 }
    const piece = Math.min(Math.max(0, pos.piece), pageCounts.length - 1)
    const pages = effectivePages(pageCounts[piece])
    const page = spreadStart(Math.min(Math.max(1, pos.page), pages), spread)
    return { piece, page }
}

/** Next spread, crossing into the next piece. `null` at the very end. */
export const nextPosition = (
    pos: PlayerPosition,
    pageCounts: number[],
    spread: Spread,
): PlayerPosition | null => {
    const cur = clampPosition(pos, pageCounts, spread)
    const pages = effectivePages(pageCounts[cur.piece])
    if (cur.page + spread <= pages) return { piece: cur.piece, page: cur.page + spread }
    if (cur.piece + 1 < pageCounts.length) return { piece: cur.piece + 1, page: 1 }
    return null
}

/** Previous spread, crossing back to the last spread of the previous piece. `null` at the start. */
export const prevPosition = (
    pos: PlayerPosition,
    pageCounts: number[],
    spread: Spread,
): PlayerPosition | null => {
    const cur = clampPosition(pos, pageCounts, spread)
    if (cur.page > 1) return { piece: cur.piece, page: Math.max(1, cur.page - spread) }
    if (cur.piece > 0) {
        const prev = cur.piece - 1
        return { piece: prev, page: lastSpreadStart(pageCounts[prev], spread) }
    }
    return null
}

/** Pages of the current piece that are visible for this position. */
export const visiblePages = (pos: PlayerPosition, pageCount: number, spread: Spread): number[] => {
    const pages = effectivePages(pageCount)
    const out: number[] = []
    for (let p = pos.page; p < pos.page + spread && p <= pages; p++) out.push(p)
    return out
}

/** 0..1 progress through the whole setlist, for the progress bar. */
export const progress = (pos: PlayerPosition, pageCounts: number[]): number => {
    if (pageCounts.length === 0) return 0
    const total = pageCounts.reduce((sum, c) => sum + effectivePages(c), 0)
    const before = pageCounts.slice(0, pos.piece).reduce((sum, c) => sum + effectivePages(c), 0)
    return Math.min(1, (before + pos.page) / total)
}

/**
 * Keyboard mapping. Bluetooth page-turn pedals (AirTurn, PageFlip, Donner, …)
 * emulate a keyboard and send arrows or PageUp/PageDown depending on their mode,
 * so all of them map to the same two actions.
 */
export const keyAction = (key: string): NavAction | null => {
    switch (key) {
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
        case " ":
        case "Enter":
            return "next"
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
        case "Backspace":
            return "prev"
        default:
            return null
    }
}

export type TapZone = NavAction | "menu"

/**
 * Tap zones: left 30 % goes back, the middle toggles the toolbar, the right
 * 45 % goes forward — forward is by far the most common action mid-piece.
 */
export const tapZone = (x: number, width: number): TapZone => {
    if (width <= 0) return "next"
    const ratio = x / width
    if (ratio < 0.3) return "prev"
    if (ratio >= 0.55) return "next"
    return "menu"
}

/** Horizontal swipe → action; short or mostly vertical gestures are ignored. */
export const swipeAction = (dx: number, dy: number, minDistance = 50): NavAction | null => {
    if (Math.abs(dx) < minDistance || Math.abs(dx) < Math.abs(dy) * 1.5) return null
    return dx < 0 ? "next" : "prev"
}

/** Auto spread: two pages side by side when the screen is clearly landscape. */
export const autoSpread = (width: number, height: number): Spread =>
    width > height * 1.2 ? 2 : 1
