import { describe, expect, it } from "vitest"
import {
    autoSpread,
    clampPosition,
    keyAction,
    nextPosition,
    prevPosition,
    progress,
    spreadStart,
    swipeAction,
    tapZone,
    visiblePages,
} from "./playerNav"

describe("single page navigation", () => {
    const counts = [3, 2]

    it("advances within a piece and crosses into the next", () => {
        expect(nextPosition({ piece: 0, page: 1 }, counts, 1)).toEqual({ piece: 0, page: 2 })
        expect(nextPosition({ piece: 0, page: 3 }, counts, 1)).toEqual({ piece: 1, page: 1 })
        expect(nextPosition({ piece: 1, page: 2 }, counts, 1)).toBeNull()
    })

    it("goes back to the last page of the previous piece", () => {
        expect(prevPosition({ piece: 1, page: 1 }, counts, 1)).toEqual({ piece: 0, page: 3 })
        expect(prevPosition({ piece: 0, page: 1 }, counts, 1)).toBeNull()
    })
})

describe("two page spreads", () => {
    const counts = [5, 4]

    it("steps by two and lands on the odd last spread", () => {
        expect(nextPosition({ piece: 0, page: 1 }, counts, 2)).toEqual({ piece: 0, page: 3 })
        expect(nextPosition({ piece: 0, page: 3 }, counts, 2)).toEqual({ piece: 0, page: 5 })
        expect(nextPosition({ piece: 0, page: 5 }, counts, 2)).toEqual({ piece: 1, page: 1 })
        expect(prevPosition({ piece: 1, page: 1 }, counts, 2)).toEqual({ piece: 0, page: 5 })
        expect(prevPosition({ piece: 1, page: 3 }, counts, 2)).toEqual({ piece: 1, page: 1 })
    })

    it("shows only existing pages on the last spread", () => {
        expect(visiblePages({ piece: 0, page: 5 }, 5, 2)).toEqual([5])
        expect(visiblePages({ piece: 0, page: 3 }, 5, 2)).toEqual([3, 4])
    })

    it("realigns when switching from single to double pages", () => {
        expect(spreadStart(4, 2)).toBe(3)
        expect(clampPosition({ piece: 0, page: 4 }, counts, 2)).toEqual({ piece: 0, page: 3 })
    })
})

describe("pieces without PDF", () => {
    it("count as one placeholder page", () => {
        const counts = [0, 2]
        expect(nextPosition({ piece: 0, page: 1 }, counts, 1)).toEqual({ piece: 1, page: 1 })
        expect(prevPosition({ piece: 1, page: 1 }, counts, 2)).toEqual({ piece: 0, page: 1 })
    })

    it("clamps out-of-range positions (e.g. a restored position after edits)", () => {
        expect(clampPosition({ piece: 9, page: 9 }, [2, 3], 1)).toEqual({ piece: 1, page: 3 })
        expect(clampPosition({ piece: 0, page: 1 }, [], 1)).toEqual({ piece: 0, page: 1 })
    })
})

describe("progress", () => {
    it("measures across the whole setlist", () => {
        expect(progress({ piece: 0, page: 1 }, [2, 2])).toBe(0.25)
        expect(progress({ piece: 1, page: 2 }, [2, 2])).toBe(1)
    })
})

describe("input mapping", () => {
    it("maps pedal and keyboard keys", () => {
        expect(keyAction("PageDown")).toBe("next")
        expect(keyAction("ArrowRight")).toBe("next")
        expect(keyAction(" ")).toBe("next")
        expect(keyAction("PageUp")).toBe("prev")
        expect(keyAction("ArrowLeft")).toBe("prev")
        expect(keyAction("a")).toBeNull()
    })

    it("splits the screen into tap zones", () => {
        expect(tapZone(10, 1000)).toBe("prev")
        expect(tapZone(400, 1000)).toBe("menu")
        expect(tapZone(900, 1000)).toBe("next")
    })

    it("recognises horizontal swipes only", () => {
        expect(swipeAction(-120, 10)).toBe("next")
        expect(swipeAction(120, 10)).toBe("prev")
        expect(swipeAction(-30, 0)).toBeNull()
        expect(swipeAction(-80, 100)).toBeNull()
    })

    it("uses two pages only on clearly landscape screens", () => {
        expect(autoSpread(1920, 1080)).toBe(2)
        expect(autoSpread(1080, 1920)).toBe(1)
        expect(autoSpread(1100, 1000)).toBe(1)
    })
})
