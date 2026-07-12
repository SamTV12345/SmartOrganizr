import type { IdentifyCandidate, Note } from "@/src/api/types";

/**
 * Client-side port of the sheet-matching pipeline in api_go/service/inventoryService.go,
 * used for offline inventory sweeps: OCR text from a photographed first page is ranked
 * against the notes cached in IndexedDB. Keep in sync with the Go implementation.
 */

// Part tokens are instrument/part words printed on sheets that carry no identity —
// stripped from both sides before scoring so "Flöte 1" on the photo doesn't drag
// down the match against the plain work title. Mirrors `partTokens` in Go.
const PART_TOKENS = new Set([
  "flöte", "floete", "oboe", "klarinette", "fagott",
  "saxophon", "trompete", "flügelhorn", "fluegelhorn",
  "horn", "posaune", "tenorhorn", "bariton", "euphonium",
  "tuba", "schlagzeug", "percussion", "pauken",
  "partitur", "direktion", "stimme", "score", "part",
  "in", "es", "b", "c", "f",
  "1", "2", "3", "4", "i", "ii", "iii",
]);

/** Lowercase, strip punctuation (keeping äöüß) and part tokens, return the remaining words. */
export function normalizeSheetTokens(s: string): string[] {
  let cleaned = "";
  for (const ch of s.toLowerCase()) {
    const keep = (ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9")
      || ch === "ä" || ch === "ö" || ch === "ü" || ch === "ß";
    cleaned += keep ? ch : " ";
  }
  return cleaned.split(/\s+/).filter((tok) => tok.length > 0 && !PART_TOKENS.has(tok));
}

/** Whether a and b are within edit distance 1. */
export function levenshteinAtMostOne(a: string, b: string): boolean {
  if (a.length > b.length) [a, b] = [b, a];
  const la = a.length;
  const lb = b.length;
  if (lb - la > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    edits++;
    if (edits > 1) return false;
    if (la === lb) i++; // substitution
    j++; // insertion into a / skip in b
  }
  return edits + (lb - j) <= 1;
}

/**
 * Whether a name token appears in the OCR tokens, tolerating one edit for words of
 * five or more characters (OCR noise like "armen1an").
 */
export function tokenMatches(nameTok: string, ocrTokens: string[]): boolean {
  for (const ocrTok of ocrTokens) {
    if (ocrTok === nameTok) return true;
    if (nameTok.length >= 5 && levenshteinAtMostOne(nameTok, ocrTok)) return true;
  }
  return false;
}

/**
 * Score how well OCR text from a photographed first page matches a note name, 0–100.
 * The name side dominates: a short title fully contained in noisy OCR output scores high.
 */
export function scoreSheetMatch(ocrText: string, noteName: string): number {
  const nameTokens = normalizeSheetTokens(noteName);
  const ocrTokens = normalizeSheetTokens(ocrText);
  if (nameTokens.length === 0 || ocrTokens.length === 0) return 0;
  let matched = 0;
  for (const tok of nameTokens) {
    if (tokenMatches(tok, ocrTokens)) matched++;
  }
  return Math.floor((matched * 100) / nameTokens.length);
}

// Mirrors identifyMinScore / identifyMaxCandidates in Go.
const MIN_SCORE = 25;
const MAX_CANDIDATES = 5;

/**
 * Rank the offline note library against OCR text and return the top candidates,
 * shape-compatible with the online identify endpoint (`IdentifyCandidate`).
 * Offline there is no AI fallback and no inventory number (assigned server-side).
 */
export function rankOfflineCandidates(ocrText: string, notes: Note[]): IdentifyCandidate[] {
  const out: IdentifyCandidate[] = [];
  for (const note of notes) {
    const score = scoreSheetMatch(ocrText, note.name ?? "");
    if (score < MIN_SCORE) continue;
    out.push({
      noteId: note.id,
      name: note.name,
      folderId: note.parent?.id,
      numberOfPages: note.numberOfPages,
      confidence: score,
      matchedVia: "OCR",
    });
  }
  out.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  return out.slice(0, MAX_CANDIDATES);
}
