package service

import "testing"

func TestNormalizeSheetTokens(t *testing.T) {
	cases := []struct {
		in   string
		want []string
	}{
		{"Armenian Dances — Flöte 1 in C", []string{"armenian", "dances"}},
		{"BÖHMISCHER TRAUM (Polka)", []string{"böhmischer", "traum", "polka"}},
		{"Trompete 2 in B", nil},
	}
	for _, tc := range cases {
		got := normalizeSheetTokens(tc.in)
		if len(got) != len(tc.want) {
			t.Fatalf("normalize(%q) = %v, want %v", tc.in, got, tc.want)
		}
		for i := range got {
			if got[i] != tc.want[i] {
				t.Fatalf("normalize(%q) = %v, want %v", tc.in, got, tc.want)
			}
		}
	}
}

func TestScoreSheetMatch(t *testing.T) {
	ocr := `ARMENIAN DANCES (Part I)
	Alfred Reed
	Flöte 1
	© 1972 Sam Fox Publishing`

	if score := scoreSheetMatch(ocr, "Armenian Dances"); score != 100 {
		t.Fatalf("full title match expected 100, got %d", score)
	}
	if score := scoreSheetMatch(ocr, "Böhmischer Traum"); score != 0 {
		t.Fatalf("unrelated title expected 0, got %d", score)
	}
	// Partial: one of two tokens present.
	if score := scoreSheetMatch(ocr, "Armenian Rhapsody"); score != 50 {
		t.Fatalf("half match expected 50, got %d", score)
	}
}

func TestScoreSheetMatchToleratesOcrNoise(t *testing.T) {
	// OCR misread: 1 instead of i.
	if score := scoreSheetMatch("ARMEN1AN DANCES", "Armenian Dances"); score != 100 {
		t.Fatalf("expected fuzzy token match to yield 100, got %d", score)
	}
	// Short tokens get no fuzz — "born" must not match "horn"-like noise.
	if score := scoreSheetMatch("bern", "born"); score != 0 {
		t.Fatalf("short tokens must match exactly, got %d", score)
	}
}

func TestLevenshteinAtMostOne(t *testing.T) {
	cases := []struct {
		a, b string
		want bool
	}{
		{"armenian", "armen1an", true}, // substitution
		{"dances", "dance", true},      // deletion
		{"traum", "trauum", true},      // insertion
		{"polka", "waltz", false},
		{"abc", "abcde", false},
	}
	for _, tc := range cases {
		if got := levenshteinAtMostOne(tc.a, tc.b); got != tc.want {
			t.Fatalf("levenshteinAtMostOne(%q, %q) = %v, want %v", tc.a, tc.b, got, tc.want)
		}
	}
}
