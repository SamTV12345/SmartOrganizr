import { describe, expect, it } from "vitest"
import { guessSectionId, partNameFromFile } from "./ScoreParts"

const sections = [
    { id: "kl", name: "Klarinetten" },
    { id: "fl", name: "Flöten" },
    { id: "hr", name: "Hörner" },
    { id: "tb", name: "Tiefes Blech" },
    { id: "tp", name: "Trompeten" },
]

describe("partNameFromFile", () => {
    it("strips the extension and tidies separators", () => {
        expect(partNameFromFile("2. Klarinette in B.pdf")).toBe("2. Klarinette in B")
        expect(partNameFromFile("Tuba_in_C.PDF")).toBe("Tuba in C")
    })
})

describe("guessSectionId", () => {
    it("matches singular part names to plural sections", () => {
        expect(guessSectionId("2. Klarinette in B", sections)).toBe("kl")
        expect(guessSectionId("Flöte 1", sections)).toBe("fl")
        expect(guessSectionId("Horn in F", sections)).toBe("hr")
        expect(guessSectionId("1. Trompete", sections)).toBe("tp")
    })

    it("returns nothing when no or several sections fit", () => {
        expect(guessSectionId("Direktion", sections)).toBeUndefined()
        expect(guessSectionId("Tuba", sections)).toBeUndefined()
        expect(guessSectionId("Klarinette / Flöte", sections)).toBeUndefined()
        expect(guessSectionId("Klarinette", [])).toBeUndefined()
    })
})
