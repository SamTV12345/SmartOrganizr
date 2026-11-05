// Annotation model for the play mode. All coordinates are normalised to the
// page (0..1 in both axes) and widths/sizes to the page width, so a mark made
// on a phone lands on the same spot on a tablet. Pure — no React, no DOM.

export type Point = [number, number]
export type DrawTool = "pen" | "highlighter"
export type Tool = DrawTool | "text" | "eraser"

export interface Stroke {
    id: string
    tool: DrawTool
    color: string
    /** Line width as a fraction of the page width. */
    width: number
    points: Point[]
}

export interface TextNote {
    id: string
    x: number
    y: number
    text: string
    color: string
    /** Font size as a fraction of the page width. */
    size: number
}

export interface PageAnnotations {
    v: 1
    strokes: Stroke[]
    texts: TextNote[]
}

export const emptyPage = (): PageAnnotations => ({ v: 1, strokes: [], texts: [] })

export const isEmptyPage = (page: PageAnnotations | undefined): boolean =>
    !page || (page.strokes.length === 0 && page.texts.length === 0)

const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n)
const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/** Parses stored JSON defensively: unknown or broken entries are dropped, never thrown. */
export const parsePage = (json: string | undefined | null): PageAnnotations => {
    if (!json) return emptyPage()
    let raw: unknown
    try {
        raw = JSON.parse(json)
    } catch {
        return emptyPage()
    }
    if (!raw || typeof raw !== "object") return emptyPage()
    const obj = raw as { strokes?: unknown; texts?: unknown }
    const strokes = (Array.isArray(obj.strokes) ? obj.strokes : []).flatMap((s): Stroke[] => {
        if (!s || typeof s !== "object") return []
        const st = s as Partial<Stroke>
        if (typeof st.id !== "string" || (st.tool !== "pen" && st.tool !== "highlighter") || !Array.isArray(st.points)) return []
        const points = st.points.filter((p): p is Point => Array.isArray(p) && finite(p[0]) && finite(p[1]))
        if (points.length === 0) return []
        return [{ id: st.id, tool: st.tool, color: typeof st.color === "string" ? st.color : "#000000", width: finite(st.width) ? st.width : 0.003, points }]
    })
    const texts = (Array.isArray(obj.texts) ? obj.texts : []).flatMap((t): TextNote[] => {
        if (!t || typeof t !== "object") return []
        const tx = t as Partial<TextNote>
        if (typeof tx.id !== "string" || typeof tx.text !== "string" || !finite(tx.x) || !finite(tx.y)) return []
        return [{ id: tx.id, x: clamp01(tx.x), y: clamp01(tx.y), text: tx.text, color: typeof tx.color === "string" ? tx.color : "#000000", size: finite(tx.size) ? tx.size : 0.025 }]
    })
    return { v: 1, strokes, texts }
}

export const serializePage = (page: PageAnnotations): string => JSON.stringify(page)

/** Converts a pointer position inside a page box to normalised coordinates. */
export const normalize = (x: number, y: number, width: number, height: number): Point =>
    width > 0 && height > 0 ? [clamp01(x / width), clamp01(y / height)] : [0, 0]

/**
 * Drops points closer than `minDistance` (normalised) to the previously kept
 * one; keeps the last point so the stroke ends where the pen lifted.
 * Rounds to 4 decimals — plenty for a page, and keeps the JSON small.
 */
export const simplify = (points: Point[], minDistance = 0.002): Point[] => {
    if (points.length <= 2) return points.map(round)
    const out: Point[] = [points[0]]
    for (let i = 1; i < points.length - 1; i++) {
        const [px, py] = out[out.length - 1]
        if (Math.hypot(points[i][0] - px, points[i][1] - py) >= minDistance) out.push(points[i])
    }
    out.push(points[points.length - 1])
    return out.map(round)
}

const round = ([x, y]: Point): Point => [Math.round(x * 10000) / 10000, Math.round(y * 10000) / 10000]

const distanceToSegment = ([px, py]: Point, [ax, ay]: Point, [bx, by]: Point): number => {
    const dx = bx - ax
    const dy = by - ay
    const len2 = dx * dx + dy * dy
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/**
 * Id of the topmost stroke or text note under `point` (eraser). `aspect` is
 * page height / width, so distances are measured in page-width units on both axes.
 */
export const hitTest = (page: PageAnnotations, point: Point, radius: number, aspect = 1): string | undefined => {
    const scale = (p: Point): Point => [p[0], p[1] * aspect]
    const sp = scale(point)
    for (let i = page.texts.length - 1; i >= 0; i--) {
        const t = page.texts[i]
        const width = t.text.length * t.size * 0.6
        const top = t.y * aspect - t.size
        if (sp[0] >= t.x - radius && sp[0] <= t.x + width + radius && sp[1] >= top - radius && sp[1] <= t.y * aspect + radius) return t.id
    }
    for (let i = page.strokes.length - 1; i >= 0; i--) {
        const s = page.strokes[i]
        const pts = s.points.map(scale)
        const reach = radius + s.width / 2
        if (pts.length === 1 && Math.hypot(sp[0] - pts[0][0], sp[1] - pts[0][1]) <= reach) return s.id
        for (let j = 1; j < pts.length; j++) if (distanceToSegment(sp, pts[j - 1], pts[j]) <= reach) return s.id
    }
    return undefined
}

export const removeItem = (page: PageAnnotations, id: string): PageAnnotations => ({
    ...page,
    strokes: page.strokes.filter((s) => s.id !== id),
    texts: page.texts.filter((t) => t.id !== id),
})

/** SVG path for a stroke inside a box of the given pixel size. */
export const strokePath = (points: Point[], width: number, height: number): string => {
    if (points.length === 0) return ""
    const [first, ...rest] = points
    const fmt = ([x, y]: Point) => `${(x * width).toFixed(1)} ${(y * height).toFixed(1)}`
    // A single tap still draws a dot.
    if (rest.length === 0) return `M ${fmt(first)} L ${fmt(first)}`
    return `M ${fmt(first)} ` + rest.map((p) => `L ${fmt(p)}`).join(" ")
}

export const newId = (): string =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

/** Pen presets shown in the palette. */
export const PEN_COLORS = ["#111111", "#d32f2f", "#1565c0"] as const
export const HIGHLIGHTER_COLOR = "#ffd600"
export const PEN_WIDTH = 0.0035
export const HIGHLIGHTER_WIDTH = 0.02
export const TEXT_SIZE = 0.028
