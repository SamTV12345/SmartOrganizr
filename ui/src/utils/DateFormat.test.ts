import { describe, expect, it } from "vitest";
import { formatDateLong, formatDateOnly, formatDateTime, resolveDateLocale } from "@/src/utils/DateFormat";

describe("resolveDateLocale", () => {
    it("picks German for de and its regional variants", () => {
        expect(resolveDateLocale("de").code).toBe("de");
        expect(resolveDateLocale("de-AT").code).toBe("de");
    });

    it("falls back to US English for everything else", () => {
        expect(resolveDateLocale("en").code).toBe("en-US");
        expect(resolveDateLocale("fr").code).toBe("en-US");
        expect(resolveDateLocale("").code).toBe("en-US");
    });
});

describe("formatDateTime", () => {
    it("formats German and English differently", () => {
        const iso = "2026-03-04T15:30:00.000Z";
        const german = formatDateTime(iso, "de");
        const english = formatDateTime(iso, "en");
        expect(german).not.toBe("");
        expect(english).not.toBe("");
        expect(german).not.toBe(english);
    });

    it("returns an empty string for missing or invalid input", () => {
        expect(formatDateTime(undefined, "de")).toBe("");
        expect(formatDateTime(null, "de")).toBe("");
        expect(formatDateTime("", "de")).toBe("");
        expect(formatDateTime("not-a-date", "de")).toBe("");
        expect(formatDateTime(Number.NaN, "de")).toBe("");
    });

    it("accepts epoch milliseconds and Date objects, not just ISO strings", () => {
        const iso = "2026-03-04T15:30:00.000Z";
        const epoch = new Date(iso).getTime();
        expect(formatDateTime(epoch, "de")).toBe(formatDateTime(iso, "de"));
        expect(formatDateTime(new Date(iso), "de")).toBe(formatDateTime(iso, "de"));
    });
});

describe("formatDateLong", () => {
    it("spells the month out in the active language", () => {
        const iso = "2026-03-04T12:00:00.000Z";
        expect(formatDateLong(iso, "de")).toContain("März");
        expect(formatDateLong(iso, "en")).toContain("March");
    });

    it("returns an empty string for invalid input", () => {
        expect(formatDateLong("nope", "de")).toBe("");
    });
});

describe("formatDateOnly", () => {
    it("omits the time", () => {
        const formatted = formatDateOnly("2026-03-04T15:30:00.000Z", "de");
        expect(formatted).not.toBe("");
        expect(formatted).not.toContain(":");
    });

    it("returns an empty string for invalid input", () => {
        expect(formatDateOnly("nope", "en")).toBe("");
    });
});
