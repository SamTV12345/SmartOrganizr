import { describe, it, expect } from "vitest";
import {
  normalizeSheetTokens, levenshteinAtMostOne, scoreSheetMatch, rankOfflineCandidates,
} from "./inventoryMatching";
import type { Folder, Note } from "@/src/api/types";

// Mirrors api_go/service/inventoryMatching_test.go.

describe("normalizeSheetTokens", () => {
  it.each([
    ["Armenian Dances — Flöte 1 in C", ["armenian", "dances"]],
    ["BÖHMISCHER TRAUM (Polka)", ["böhmischer", "traum", "polka"]],
    ["Trompete 2 in B", []],
  ])("normalize(%s)", (input, want) => {
    expect(normalizeSheetTokens(input)).toEqual(want);
  });
});

describe("scoreSheetMatch", () => {
  const ocr = `ARMENIAN DANCES (Part I)
  Alfred Reed
  Flöte 1
  © 1972 Sam Fox Publishing`;

  it("full title match scores 100", () => {
    expect(scoreSheetMatch(ocr, "Armenian Dances")).toBe(100);
  });

  it("unrelated title scores 0", () => {
    expect(scoreSheetMatch(ocr, "Böhmischer Traum")).toBe(0);
  });

  it("partial match (one of two tokens) scores 50", () => {
    expect(scoreSheetMatch(ocr, "Armenian Rhapsody")).toBe(50);
  });

  it("tolerates OCR noise via one-edit fuzz for long tokens", () => {
    // OCR misread: 1 instead of i.
    expect(scoreSheetMatch("ARMEN1AN DANCES", "Armenian Dances")).toBe(100);
  });

  it("short tokens get no fuzz", () => {
    expect(scoreSheetMatch("bern", "born")).toBe(0);
  });

  it("empty sides score 0", () => {
    expect(scoreSheetMatch("", "Armenian Dances")).toBe(0);
    expect(scoreSheetMatch(ocr, "Trompete 2 in B")).toBe(0);
  });
});

describe("levenshteinAtMostOne", () => {
  it.each([
    ["armenian", "armen1an", true], // substitution
    ["dances", "dance", true], // deletion
    ["traum", "trauum", true], // insertion
    ["polka", "waltz", false],
    ["abc", "abcde", false],
  ])("levenshteinAtMostOne(%s, %s) = %s", (a, b, want) => {
    expect(levenshteinAtMostOne(a, b)).toBe(want);
  });
});

describe("rankOfflineCandidates", () => {
  const note = (id: string, name: string, pages?: number, parentId?: string): Note =>
    ({
      id, name, type: "note", numberOfPages: pages,
      parent: parentId ? ({ id: parentId } as Folder) : undefined,
    } as unknown as Note);

  const library = [
    note("n1", "Armenian Dances", 10, "f1"),
    note("n2", "Armenian Rhapsody", 8, "f2"),
    note("n3", "Böhmischer Traum"),
    note("n4", "Armenian Dances Part II"),
    note("n5", "Dances with Wolves"),
    note("n6", "Armenian Songs"),
    note("n7", "Old Dances"),
  ];

  it("ranks the exact title first with candidate shape compatible to the identify endpoint", () => {
    const got = rankOfflineCandidates("ARMEN1AN DANCES (Part I)\nAlfred Reed\nFlöte 1", library);
    expect(got[0]).toEqual({
      noteId: "n1", name: "Armenian Dances", folderId: "f1",
      numberOfPages: 10, confidence: 100, matchedVia: "OCR",
    });
    // Sorted by confidence, descending.
    const confidences = got.map((c) => c.confidence ?? 0);
    expect([...confidences].sort((a, b) => b - a)).toEqual(confidences);
  });

  it("returns at most 5 candidates and drops scores below the minimum", () => {
    const got = rankOfflineCandidates("ARMENIAN DANCES", library);
    expect(got.length).toBeLessThanOrEqual(5);
    expect(got.every((c) => (c.confidence ?? 0) >= 25)).toBe(true);
    expect(got.map((c) => c.noteId)).not.toContain("n3");
  });

  it("returns nothing for unrelated OCR text", () => {
    expect(rankOfflineCandidates("Alte Kameraden Marsch", library)).toEqual([]);
  });
});
