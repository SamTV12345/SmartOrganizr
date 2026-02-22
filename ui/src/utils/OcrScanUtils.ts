type OcrLine = {
    text?: string;
    confidence?: number;
    bbox?: { x0?: number; x1?: number; y0?: number; y1?: number };
    words?: OcrWord[];
};
type OcrWord = {
    text?: string;
    confidence?: number;
    bbox?: { x0?: number; x1?: number; y0?: number; y1?: number };
};
type OcrParagraph = { lines?: OcrLine[] };
type OcrBlock = { paragraphs?: OcrParagraph[] };
type OcrData = { blocks?: OcrBlock[] };

const normalizeLine = (line: string): string =>
    line.replace(/\s+/g, " ").trim();

const cleanPotentialTitle = (line: string): string =>
    normalizeLine(line)
        .replace(/^[^A-Za-zÄÖÜäöüß0-9]+/, "")
        .replace(/[^A-Za-zÄÖÜäöüß0-9)\]]+$/, "")
        .trim();

const hasEnoughLetters = (line: string): boolean => {
    const letters = [...line].filter((c) =>
        /[A-Za-zÄÖÜäöüß]/.test(c)
    ).length;
    const nonWhitespace = [...line].filter((c) => !/\s/.test(c)).length;
    if (nonWhitespace === 0) return false;
    return letters >= 3 && letters / nonWhitespace >= 0.5;
};

const isLikelyAuthorLine = (line: string): boolean => {
    const normalized = normalizeLine(line);
    if (
        /^(by|von|arr\.?|arranged by|composer|composed by|music by|komponist|komponistin)\b/i.test(
            normalized
        )
    ) {
        return true;
    }
    const words = normalized.split(" ").filter(Boolean);
    return (
        words.length >= 2 &&
        words.length <= 4 &&
        normalized.length <= 35 &&
        words.every((word) => /^[A-ZÄÖÜ][a-zäöüß-]+$/.test(word))
    );
};

const AUTHOR_PREFIX_PATTERN =
    /^(by|von|arr\.?|arranged by|composer|composed by|music by|komponist|komponistin)\b[:.\-\s]*/i;

const cleanPotentialAuthor = (line: string): string =>
    normalizeLine(line)
        .replace(AUTHOR_PREFIX_PATTERN, "")
        .replace(/^[^A-Za-zÄÖÜäöüß]+/, "")
        .replace(/[^A-Za-zÄÖÜäöüß.\-'\s]+$/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();

const looksLikePersonName = (line: string): boolean => {
    const normalized = cleanPotentialAuthor(line);
    if (!normalized) return false;
    if (normalized.length < 3 || normalized.length > 60) return false;
    if (/[0-9]/.test(normalized)) return false;

    const words = normalized.split(" ").filter(Boolean);
    if (words.length < 2 || words.length > 5) return false;

    return words.every((word) =>
        /^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß.'-]{0,24}$/.test(word)
    );
};

const isLikelyPublisherOrJunkLine = (line: string): boolean => {
    const n = normalizeLine(line);

    if (/©|℗|\(c\)|all rights reserved|printed in/i.test(n)) return true;
    if (/https?:\/\/|www\.|\.com|\.de|\.ch|\.at|@/.test(n)) return true;
    if (/p\.?\s*o\.?\s*box/i.test(n)) return true;
    if (/\b[A-Z]{1,3}-\d{4,5}\b/.test(n)) return true;
    if ((n.match(/,/g) ?? []).length >= 2) return true;
    if (/^\d[\d.\s-]*$/.test(n)) return true;
    if (/\d\s*\/\s*\d/.test(n)) return true;
    if (
        /\b(publ(ishing|isher|\.)?|edition|verlag|music\s+co|productions?|records?|gmbh|ltd|inc\.|s\.a\.|s\.r\.l\.)\b/i.test(
            n
        )
    )
        return true;
    if (
        /\b(switzerland|germany|austria|france|italy|england|polska|nederland)\b/i.test(
            n
        )
    )
        return true;
    if (/\b[A-Z]{1,3}\d{3,}\b/.test(n)) return true;
    if (n.length > 70) return true;

    return false;
};

const fixCommonOcrTitleConfusions = (title: string): string => {
    const letters = [...title].filter((c) =>
        /[A-Za-zÄÖÜäöüß]/.test(c)
    ).length;
    const digits = [...title].filter((c) => /[0-9]/.test(c)).length;
    if (!(letters >= 4 && digits <= 2)) return title;

    const corrected = title
        .replace(/\b1\b/g, "I")
        .replace(/(?<=[A-Za-zÄÖÜäöüß])1(?=[A-Za-zÄÖÜäöüß])/g, "I")
        .replace(/(?<=[A-Za-zÄÖÜäöüß])0(?=[A-Za-zÄÖÜäöüß])/g, "O");

    const tokens = corrected.split(/\s+/).filter(Boolean);
    if (tokens.length < 2) return corrected;

    const normalizeWord = (word: string): string =>
        word.replace(/[^A-Za-zÄÖÜäöüß]/g, "").toLocaleLowerCase();

    const commonPrefixLength = (a: string, b: string): number => {
        const max = Math.min(a.length, b.length);
        let i = 0;
        while (i < max && a[i] === b[i]) i++;
        return i;
    };

    const isAllUpper = (word: string): boolean =>
        /[A-ZÄÖÜ]/.test(word) && word === word.toLocaleUpperCase();

    const maybeFixTrailingLl = (word: string): string => {
        if (!/ll\b/i.test(word)) return word;
        const replacement = isAllUpper(word) ? "LI" : "li";
        return word.replace(/ll\b/i, replacement);
    };

    for (let i = 0; i < tokens.length - 1; i++) {
        const first = tokens[i];
        const second = tokens[i + 1];
        const firstNorm = normalizeWord(first);
        const secondNorm = normalizeWord(second);

        if (firstNorm.length < 5 || secondNorm.length < 5) continue;
        if (!firstNorm.endsWith("ll")) continue;
        if (!/[aeiouyäöü]$/i.test(secondNorm)) continue;

        const firstStem = firstNorm.slice(0, -2);
        const secondStem = secondNorm.slice(0, -1);
        if (commonPrefixLength(firstStem, secondStem) < 4) continue;

        tokens[i] = maybeFixTrailingLl(first);
    }

    return tokens.join(" ");
};

const extractLikelyTitleSegment = (line: string): string => {
    const normalized = normalizeLine(line);

    const upperRuns = [
        ...normalized.matchAll(
            /\b[A-ZÄÖÜ0-9][A-ZÄÖÜ0-9'’.-]*(?:\s+[A-ZÄÖÜ0-9][A-ZÄÖÜ0-9'’.-]*)+\b/g
        ),
    ].map((m) => m[0].trim());

    if (upperRuns.length === 0) return normalized;

    upperRuns.sort((a, b) => b.length - a.length);

    const best = upperRuns[0]
        .replace(/\b(ARR|ARR\.|ARRANGEMENT|EDITION)\b.*$/i, "")
        .trim();

    return best || normalized;
};

const extractTitleFromLineWords = (line: OcrLine): string => {
    const words = (line.words ?? [])
        .map((w) => ({
            text: cleanPotentialTitle(w.text ?? ""),
            confidence: Number(w.confidence ?? 0),
            x0: Number(w.bbox?.x0 ?? 0),
            x1: Number(w.bbox?.x1 ?? 0),
        }))
        .filter((w) => w.text.length > 0)
        .sort((a, b) => a.x0 - b.x0);

    if (words.length < 2) {
        return "";
    }

    while (
        words.length > 2 &&
        words[0].text.length <= 2 &&
        words[0].confidence < 45
    ) {
        words.shift();
    }

    if (words.length < 2) {
        return "";
    }

    let maxGap = -1;
    let splitAfter = -1;

    for (let i = 0; i < words.length - 1; i++) {
        const gap = words[i + 1].x0 - words[i].x1;
        if (gap > maxGap) {
            maxGap = gap;
            splitAfter = i;
        }
    }

    const strongGap = maxGap >= 70;
    const leftWords =
        strongGap && splitAfter >= 1
            ? words.slice(0, splitAfter + 1)
            : words;

    const joined = normalizeLine(
        leftWords.map((w) => w.text).join(" ").replace(/\s*-\s*/g, " - ")
    );
    if (!joined || !hasEnoughLetters(joined)) {
        return "";
    }
    return joined;
};

const mergeDetachedHeaderSuffix = (
    title: string,
    bestLine: OcrLine,
    topLines: OcrLine[],
    maxY: number
): string => {
    const tokens = title.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return title;

    const lastToken = tokens[tokens.length - 1];
    if (!/^[A-Za-zÄÖÜäöüß-]{3,8}$/.test(lastToken)) return title;

    const bestBox = bestLine.bbox ?? {};
    const bestX0 = Number(bestBox.x0 ?? 0);
    const bestX1 = Number(bestBox.x1 ?? 0);
    const bestY0 = Number(bestBox.y0 ?? 0);
    const bestH = Math.max(1, Number(bestBox.y1 ?? 0) - bestY0);

    let foundSuffix = "";
    for (const line of topLines) {
        if (line === bestLine) continue;
        const raw = normalizeLine(line.text ?? "");
        if (!raw || raw.length > 12) continue;

        const conf = Number(line.confidence ?? 0);
        if (conf < 55) continue;

        const box = line.bbox ?? {};
        const y0 = Number(box.y0 ?? 0);
        const x0 = Number(box.x0 ?? 0);
        const x1 = Number(box.x1 ?? 0);

        if (y0 > maxY * 0.2) continue;
        if (Math.abs(y0 - bestY0) > bestH * 1.2) continue;
        if (x1 < bestX0 || x0 > bestX1) continue;

        const words = raw
            .split(/\s+/)
            .map((w) => w.replace(/[^A-Za-zÄÖÜäöüß]/g, ""))
            .filter(Boolean);
        if (words.length === 0 || words.length > 2) continue;

        const suffix =
            words.length === 2 && words[0].length === 1 ? words[1] : words.join("");
        if (!/^[a-zäöüß]{2,8}$/.test(suffix)) continue;

        foundSuffix = suffix;
        break;
    }

    if (!foundSuffix) return title;

    const merged = `${lastToken}${foundSuffix}`;
    if (!/^[A-Za-zÄÖÜäöüß-]{5,16}$/.test(merged)) return title;

    tokens[tokens.length - 1] = merged;
    return tokens.join(" ");
};

export const extractNameFromOcr = (text: string, ocrData: unknown): string => {
    const blocks = (ocrData as OcrData | undefined)?.blocks ?? [];
    const topLines: OcrLine[] = [];

    let maxY = 0;
    for (const block of blocks) {
        for (const paragraph of block.paragraphs ?? []) {
            for (const line of paragraph.lines ?? []) {
                const y1 = line.bbox?.y1 ?? 0;
                if (y1 > maxY) maxY = y1;
                topLines.push(line);
            }
        }
    }
    if (maxY <= 0) maxY = 1;

    const candidates: Array<{
        text: string;
        confidence: number;
        height: number;
        y0: number;
        score: number;
        line: OcrLine;
    }> = [];

    for (const block of blocks) {
        for (const paragraph of block.paragraphs ?? []) {
            for (const line of paragraph.lines ?? []) {
                const lineText = cleanPotentialTitle(
                    normalizeLine(line.text ?? "")
                );

                if (lineText.length < 2 || !hasEnoughLetters(lineText))
                    continue;
                if (isLikelyPublisherOrJunkLine(lineText)) continue;

                const bbox = line.bbox ?? {};
                const width = Math.max(0, (bbox.x1 ?? 0) - (bbox.x0 ?? 0));
                const height = Math.max(
                    0,
                    (bbox.y1 ?? 0) - (bbox.y0 ?? 0)
                );
                const y0 = Math.max(0, bbox.y0 ?? 0);
                if (y0 > maxY * 0.3) continue;
                const confidence = Number(line.confidence ?? 0);
                if (confidence < 55) continue;

                const letterChars = [...lineText].filter((c) =>
                    /[A-Za-zÄÖÜäöüß]/.test(c)
                ).length;
                const upperCaseChars = [...lineText].filter((c) =>
                    /[A-ZÄÖÜ]/.test(c)
                ).length;
                const uppercaseRatio =
                    letterChars > 0 ? upperCaseChars / letterChars : 0;

                const area = width * height;
                const topOfPageBonus = 1 - y0 / maxY;
                const authorPenalty = isLikelyAuthorLine(lineText) ? 12 : 0;

                const lengthBonus =
                    lineText.length <= 50
                        ? Math.min(lineText.length, 25) / 25
                        : Math.max(0, 1 - (lineText.length - 50) / 20);

                const allCapsBonus =
                    uppercaseRatio > 0.85 && lineText.length <= 50 ? 6 : 0;

                const score =
                    height * 5.5 +
                    Math.sqrt(Math.max(area, 1)) * 0.35 +
                    confidence * 0.25 +
                    lengthBonus * 6 +
                    uppercaseRatio * 3 +
                    topOfPageBonus * 7 +
                    allCapsBonus -
                    authorPenalty;

                candidates.push({
                    text: lineText,
                    confidence,
                    height,
                    y0,
                    score,
                    line,
                });
            }
        }
    }

    if (candidates.length > 0) {
        candidates.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.height !== a.height) return b.height - a.height;
            if (a.y0 !== b.y0) return a.y0 - b.y0;
            return b.confidence - a.confidence;
        });
        const best = candidates[0];
        const fromWords = extractTitleFromLineWords(best.line);
        const baseTitle = fromWords || best.text;
        const mergedTitle = mergeDetachedHeaderSuffix(
            baseTitle,
            best.line,
            topLines,
            maxY
        );
        const corrected = fixCommonOcrTitleConfusions(mergedTitle)
            .replace(/\b(arr\.?|arranged|composer|by|von)\b.*$/i, "")
            .replace(/\/.*$/, "")
            .trim();
        return extractLikelyTitleSegment(corrected).slice(0, 120);
    }

    const fallbackLines = text
        .split("\n")
        .map(normalizeLine)
        .map(cleanPotentialTitle)
        .filter((line) => line.length > 0 && hasEnoughLetters(line))
        .filter((line) => !isLikelyAuthorLine(line))
        .filter((line) => !isLikelyPublisherOrJunkLine(line));

    if (fallbackLines.length === 0) return "";
    fallbackLines.sort((a, b) => b.length - a.length);
    const corrected = fixCommonOcrTitleConfusions(fallbackLines[0]);
    return extractLikelyTitleSegment(corrected).slice(0, 120);
};

export const extractAuthorFromOcr = (text: string, ocrData: unknown): string => {
    const blocks = (ocrData as OcrData | undefined)?.blocks ?? [];
    const candidates: Array<{
        text: string;
        confidence: number;
        y0: number;
        hasPrefix: boolean;
    }> = [];

    for (const block of blocks) {
        for (const paragraph of block.paragraphs ?? []) {
            for (const line of paragraph.lines ?? []) {
                const raw = normalizeLine(line.text ?? "");
                const cleaned = cleanPotentialAuthor(raw);
                if (!cleaned) continue;
                if (!looksLikePersonName(cleaned)) continue;
                if (isLikelyPublisherOrJunkLine(cleaned)) continue;

                const confidence = Number(line.confidence ?? 0);
                if (confidence < 55) continue;

                candidates.push({
                    text: cleaned,
                    confidence,
                    y0: Number(line.bbox?.y0 ?? 0),
                    hasPrefix: AUTHOR_PREFIX_PATTERN.test(raw),
                });
            }
        }
    }

    if (candidates.length > 0) {
        candidates.sort((a, b) => {
            if (a.hasPrefix !== b.hasPrefix) return a.hasPrefix ? -1 : 1;
            if (a.y0 !== b.y0) return a.y0 - b.y0;
            return b.confidence - a.confidence;
        });
        return candidates[0].text.slice(0, 120);
    }

    const fallback = text
        .split("\n")
        .map(cleanPotentialAuthor)
        .find((line) => looksLikePersonName(line) && !isLikelyPublisherOrJunkLine(line));

    return fallback?.slice(0, 120) ?? "";
};

export const extractDescriptionFromOcr = (text: string, ocrData: unknown): string => {
    const blocks = (ocrData as OcrData | undefined)?.blocks ?? [];
    const lines: Array<{ text: string; confidence: number; y0: number }> = [];

    let maxY = 0;
    for (const block of blocks) {
        for (const paragraph of block.paragraphs ?? []) {
            for (const line of paragraph.lines ?? []) {
                const y1 = line.bbox?.y1 ?? 0;
                if (y1 > maxY) maxY = y1;
            }
        }
    }
    if (maxY <= 0) maxY = 1;

    for (const block of blocks) {
        for (const paragraph of block.paragraphs ?? []) {
            for (const line of paragraph.lines ?? []) {
                const raw = normalizeLine(line.text ?? "");
                const candidate = cleanPotentialTitle(raw);
                if (candidate.length < 3) continue;

                const y0 = Math.max(0, line.bbox?.y0 ?? 0);
                if (y0 > maxY * 0.34) continue;

                const confidence = Number(line.confidence ?? 0);
                if (confidence < 60) continue;
                if (!hasEnoughLetters(candidate)) continue;
                if (isLikelyPublisherOrJunkLine(candidate)) continue;

                const symbolCount = [...candidate].filter((c) =>
                    /[^A-Za-zÄÖÜäöüß0-9\s]/.test(c)
                ).length;
                const nonWhitespace = [...candidate].filter((c) => !/\s/.test(c))
                    .length;
                const symbolRatio =
                    nonWhitespace > 0 ? symbolCount / nonWhitespace : 1;
                if (symbolRatio > 0.2) continue;

                lines.push({ text: candidate, confidence, y0 });
            }
        }
    }

    if (lines.length > 0) {
        lines.sort((a, b) => {
            if (a.y0 !== b.y0) return a.y0 - b.y0;
            return b.confidence - a.confidence;
        });

        const unique: string[] = [];
        for (const item of lines) {
            if (!unique.some((u) => u.toLowerCase() === item.text.toLowerCase())) {
                unique.push(item.text);
            }
        }

        return unique.slice(0, 4).join("\n");
    }

    return text
        .split("\n")
        .map(normalizeLine)
        .map(cleanPotentialTitle)
        .filter((line) => line.length >= 3 && hasEnoughLetters(line))
        .filter((line) => !isLikelyPublisherOrJunkLine(line))
        .slice(0, 4)
        .join("\n");
};

export const extractPagesFromText = (text: string, fallback: number): number => {
    const match = text.match(/(\d{1,3})\s*(seiten|seite|pages?|p\.)/i);
    if (match?.[1]) {
        const parsed = Number(match[1]);
        if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    }
    return fallback > 0 ? fallback : 1;
};
