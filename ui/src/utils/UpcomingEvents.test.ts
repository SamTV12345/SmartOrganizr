import { describe, expect, it } from "vitest";
import { mergeUpcoming, type UpcomingItem } from "@/src/utils/UpcomingEvents";

const feed = [
    { uid: "f1", summary: "Kalender spät", startDate: "2026-08-10T18:00:00Z", location: "Halle" },
    { uid: "f2", summary: "Kalender früh", startDate: "2026-08-01T18:00:00Z" },
];

const club = [
    { id: "c1", summary: "Probe", startDate: "2026-08-05T19:00:00Z", clubName: "MV Beispiel" },
    { id: "c2", summary: "Konzert", startDate: "2026-08-20T19:00:00Z", clubName: "MV Beispiel" },
];

describe("mergeUpcoming", () => {
    it("interleaves both sources by start date", () => {
        const merged = mergeUpcoming(feed, club, 10);
        expect(merged.map((item) => item.summary)).toEqual([
            "Kalender früh",
            "Probe",
            "Kalender spät",
            "Konzert",
        ]);
    });

    it("keeps the origin and the club name", () => {
        const merged = mergeUpcoming(feed, club, 10);
        const byId = new Map<string, UpcomingItem>(merged.map((item) => [item.id, item]));
        expect(byId.get("f1")?.origin).toBe("feed");
        expect(byId.get("c1")?.origin).toBe("club");
        expect(byId.get("c1")?.clubName).toBe("MV Beispiel");
    });

    it("honours the limit", () => {
        expect(mergeUpcoming(feed, club, 2).map((item) => item.summary)).toEqual([
            "Kalender früh",
            "Probe",
        ]);
    });

    it("sorts entries without a start date to the end", () => {
        const merged = mergeUpcoming([{ uid: "f3", summary: "Ohne Datum" }], club, 10);
        expect(merged[merged.length - 1].summary).toBe("Ohne Datum");
    });

    it("drops cancelled club events", () => {
        const merged = mergeUpcoming([], [{ ...club[0], cancelled: true }], 10);
        expect(merged).toEqual([]);
    });

    it("returns an empty list for empty input", () => {
        expect(mergeUpcoming([], [], 5)).toEqual([]);
        expect(mergeUpcoming(undefined, undefined, 5)).toEqual([]);
    });
});
