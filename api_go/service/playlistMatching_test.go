package service

import "testing"

func TestNormalizeTitle(t *testing.T) {
	cases := map[string]string{
		"  Böhmischer   Traum! ": "bohmischer traum",
		"Marsch-Potpourri Nr. 2": "marsch potpourri nr 2",
		"":                       "",
		"...":                    "",
	}
	for in, want := range cases {
		if got := normalizeTitle(in); got != want {
			t.Errorf("normalizeTitle(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestMatchProgramToLibrary(t *testing.T) {
	library := []PlaylistLibraryNote{
		{ID: "mine-1", Name: "Abel Tasman", HasPDF: true},
		{ID: "mine-2", Name: "Böhmischer Traum", WikidataID: "Q42", HasPDF: false},
		{ID: "mine-3", Name: "Böhmischer Traum (2. Stimme)", WikidataID: "Q42", HasPDF: true},
		{ID: "mine-4", Name: "Florentiner Marsch", HasPDF: false},
		{ID: "mine-5", Name: "florentiner marsch", HasPDF: true},
	}
	entries := []PlaylistProgramEntry{
		{EntryID: "e1", Title: "Abel Tasman", NoteID: "mine-1"},                               // own note
		{EntryID: "e2", Title: "Böhm. Traum", NoteID: "dirigent-9", SourceWikidataID: "Q42"},  // wikidata, PDF preferred
		{EntryID: "e3", Title: "Florentiner Marsch!", NoteID: "dirigent-7"},                   // title, PDF preferred
		{EntryID: "e4", Title: "Ansprache Vorstand"},                                          // free text
		{EntryID: "e5", Title: "abel tasman", NoteID: "dirigent-1", SourceWikidataID: "Q999"}, // wikidata miss → title
	}

	got := MatchProgramToLibrary(entries, library)
	want := []PlaylistMatch{
		{NoteID: "mine-1", PDFAvailable: true, Kind: PlaylistMatchOwn},
		{NoteID: "mine-3", PDFAvailable: true, Kind: PlaylistMatchWikidata},
		{NoteID: "mine-5", PDFAvailable: true, Kind: PlaylistMatchTitle},
		{Kind: PlaylistMatchNone},
		{NoteID: "mine-1", PDFAvailable: true, Kind: PlaylistMatchTitle},
	}
	if len(got) != len(want) {
		t.Fatalf("got %d matches, want %d", len(got), len(want))
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("entry %d: got %+v, want %+v", i, got[i], want[i])
		}
	}
}

func TestMatchProgramToLibraryEmptyLibrary(t *testing.T) {
	got := MatchProgramToLibrary([]PlaylistProgramEntry{{Title: "X", NoteID: "n"}}, nil)
	if len(got) != 1 || got[0].Kind != PlaylistMatchNone || got[0].NoteID != "" {
		t.Fatalf("unexpected %+v", got)
	}
}
