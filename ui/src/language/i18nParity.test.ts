import { describe, expect, it } from "vitest";
import de from "@/src/language/json/de.json";
import en from "@/src/language/json/en.json";

type Entry = { key: string; value: unknown };

const flatten = (value: unknown, prefix = ""): Entry[] => {
    if (typeof value !== "object" || value === null) return [{ key: prefix, value }];
    return Object.entries(value).flatMap(([key, child]) =>
        flatten(child, prefix ? `${prefix}.${key}` : key)
    );
};

const deEntries = flatten(de);
const enEntries = flatten(en);

describe("translation files", () => {
    it("has no key that exists in only one language", () => {
        const deKeys = deEntries.map((entry) => entry.key);
        const enKeys = enEntries.map((entry) => entry.key);
        const inDeOnly = deKeys.filter((key) => !enKeys.includes(key));
        const inEnOnly = enKeys.filter((key) => !deKeys.includes(key));
        expect({ inDeOnly, inEnOnly }).toEqual({ inDeOnly: [], inEnOnly: [] });
    });

    it("has no empty translation", () => {
        const empty = [...deEntries, ...enEntries]
            .filter((entry) => typeof entry.value !== "string" || entry.value.trim() === "")
            .map((entry) => entry.key);
        expect(empty).toEqual([]);
    });
});
