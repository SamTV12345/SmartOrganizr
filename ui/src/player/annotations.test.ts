import { describe, expect, it } from "vitest"
import {
    emptyPage,
    hitTest,
    isEmptyPage,
    normalize,
    parsePage,
    removeItem,
    serializePage,
    simplify,
    strokePath,
    type PageAnnotations,
} from "./annotations"

const page: PageAnnotations = {
    v: 1,
    strokes: [
        { id: "line", tool: "pen", color: "#000", width: 0.004, points: [[0.1, 0.5], [0.5, 0.5]] },
        { id: "dot", tool: "pen", color: "#000", width: 0.01, points: [[0.9, 0.9]] },
    ],
    texts: [{ id: "txt", x: 0.6, y: 0.2, text: "zählen", color: "#d32f2f", size: 0.03 }],
}

describe("parsePage / serializePage", () => {
    it("round-trips", () => {
        expect(parsePage(serializePage(page))).toEqual(page)
    })

    it("never throws on broken data and drops invalid entries", () => {
        expect(parsePage("not json")).toEqual(emptyPage())
        expect(parsePage(undefined)).toEqual(emptyPage())
        expect(parsePage('{"strokes":[{"id":"x","tool":"laser","points":[[0,0]]},{"id":"y","tool":"pen","points":[[0.1,"a"],[0.2,0.2]]}]}')).toEqual({
            v: 1,
            strokes: [{ id: "y", tool: "pen", color: "#000000", width: 0.003, points: [[0.2, 0.2]] }],
            texts: [],
        })
    })

    it("knows empty pages", () => {
        expect(isEmptyPage(emptyPage())).toBe(true)
        expect(isEmptyPage(undefined)).toBe(true)
        expect(isEmptyPage(page)).toBe(false)
    })
})

describe("geometry", () => {
    it("normalises pointer positions into the page and clamps", () => {
        expect(normalize(50, 100, 200, 400)).toEqual([0.25, 0.25])
        expect(normalize(-10, 500, 200, 400)).toEqual([0, 1])
        expect(normalize(5, 5, 0, 0)).toEqual([0, 0])
    })

    it("thins out dense points but keeps start and end", () => {
        const dense: [number, number][] = Array.from({ length: 101 }, (_, i) => [i / 10000, 0.5])
        const out = simplify(dense, 0.002)
        expect(out[0]).toEqual([0, 0.5])
        expect(out[out.length - 1]).toEqual([0.01, 0.5])
        expect(out.length).toBeLessThan(10)
    })

    it("hits strokes along their segments, dots and texts — topmost first", () => {
        expect(hitTest(page, [0.3, 0.505], 0.01)).toBe("line")
        expect(hitTest(page, [0.3, 0.6], 0.01)).toBeUndefined()
        expect(hitTest(page, [0.905, 0.9], 0.005)).toBe("dot")
        expect(hitTest(page, [0.65, 0.19], 0.005)).toBe("txt")
    })

    it("measures in page-width units on tall pages", () => {
        // On an A4 page (aspect ≈ 1.41) a vertical offset of 0.01 is 0.0141 page widths.
        expect(hitTest(page, [0.3, 0.51], 0.012, 1.41)).toBeUndefined()
        expect(hitTest(page, [0.3, 0.51], 0.016, 1.41)).toBe("line")
    })

    it("removes by id", () => {
        const out = removeItem(page, "line")
        expect(out.strokes.map((s) => s.id)).toEqual(["dot"])
        expect(removeItem(out, "txt").texts).toEqual([])
    })

    it("builds SVG paths in pixels, dots included", () => {
        expect(strokePath([[0.1, 0.5], [0.5, 0.5]], 200, 100)).toBe("M 20.0 50.0 L 100.0 50.0")
        expect(strokePath([[0.5, 0.5]], 200, 100)).toBe("M 100.0 50.0 L 100.0 50.0")
        expect(strokePath([], 200, 100)).toBe("")
    })
})
