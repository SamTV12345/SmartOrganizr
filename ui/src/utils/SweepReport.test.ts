import { describe, expect, it } from "vitest";
import { dismissEntry, type SweepReportSection } from "@/src/utils/SweepReport";
import type { SweepReport } from "@/src/api/types";

const report = (): SweepReport => ({
    present: [{ noteId: "a", name: "A" }],
    newHere: [{ noteId: "b", name: "B" }],
    missing: [
        { noteId: "c", name: "C" },
        { noteId: "d", name: "D" },
    ],
    incomplete: [{ noteId: "a", name: "A" }],
});

describe("dismissEntry", () => {
    it("removes only the addressed entry from the addressed section", () => {
        const next = dismissEntry(report(), "missing", "c");
        expect(next.missing?.map((entry) => entry.noteId)).toEqual(["d"]);
        expect(next.present?.map((entry) => entry.noteId)).toEqual(["a"]);
        expect(next.newHere?.map((entry) => entry.noteId)).toEqual(["b"]);
        expect(next.incomplete?.map((entry) => entry.noteId)).toEqual(["a"]);
    });

    it("leaves the same note in other sections alone", () => {
        const next = dismissEntry(report(), "present", "a");
        expect(next.present).toEqual([]);
        expect(next.incomplete?.map((entry) => entry.noteId)).toEqual(["a"]);
    });

    it("does not mutate the input", () => {
        const original = report();
        dismissEntry(original, "missing", "c");
        expect(original.missing?.map((entry) => entry.noteId)).toEqual(["c", "d"]);
    });

    it("is a no-op for unknown notes and empty sections", () => {
        expect(dismissEntry(report(), "missing", "zzz").missing?.length).toBe(2);
        const sections: SweepReportSection[] = ["present", "newHere", "missing", "incomplete"];
        for (const section of sections) {
            expect(dismissEntry({}, section, "a")).toEqual({});
        }
    });
});
