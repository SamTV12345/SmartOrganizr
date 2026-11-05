// Helpers for uploading parts (Stimmen) to the club sheet music archive.

/** "2. Klarinette in B.pdf" → "2. Klarinette in B". */
export const partNameFromFile = (fileName: string): string =>
    fileName.replace(/\.pdf$/i, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim()

const fold = (s: string) =>
    s
        .toLowerCase()
        .replace(/ä/g, "a")
        .replace(/ö/g, "o")
        .replace(/ü/g, "u")
        .replace(/ß/g, "ss")

// Plural/singular noise: "Klarinetten" ↔ "Klarinette", "Flöten" ↔ "Flöte", "Hörner" ↔ "Horn".
const stem = (word: string) => {
    let w = fold(word)
    if (w.endsWith("orner")) w = w.slice(0, -5) + "orn"
    return w.replace(/(en|n|e|s)$/, "")
}

const words = (s: string) => fold(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 3)

/**
 * Suggests the section (Register) a part belongs to from its name, e.g.
 * "2. Klarinette in B" → section "Klarinetten". Returns undefined when no or
 * more than one section fits, so the uploader is never silently misled.
 */
export const guessSectionId = (
    partName: string,
    sections: { id?: string; name?: string }[],
): string | undefined => {
    const partStems = new Set(words(partName).map(stem))
    const hits = sections.filter((s) => {
        const sectionStems = words(s.name ?? "").map(stem)
        return sectionStems.length > 0 && sectionStems.some((w) => partStems.has(w))
    })
    return hits.length === 1 ? hits[0].id : undefined
}
