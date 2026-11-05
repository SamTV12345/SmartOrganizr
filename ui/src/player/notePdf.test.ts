import { describe, expect, it } from "vitest"
import { parsePdfKey, pdfKey } from "./notePdf"

describe("pdf keys", () => {
    it("keeps bare note ids (compatible with existing offline copies)", () => {
        expect(pdfKey({ kind: "note", noteId: "n1" })).toBe("n1")
        expect(parsePdfKey("n1")).toEqual({ kind: "note", noteId: "n1" })
    })

    it("round-trips club parts", () => {
        const ref = { kind: "part", clubId: "c", scoreId: "s", partId: "p" } as const
        expect(pdfKey(ref)).toBe("part:c:s:p")
        expect(parsePdfKey(pdfKey(ref))).toEqual(ref)
    })

    it("rejects malformed keys", () => {
        expect(parsePdfKey("")).toBeUndefined()
        expect(parsePdfKey("part:c:s")).toBeUndefined()
    })
})
