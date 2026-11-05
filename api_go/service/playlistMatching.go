package service

import (
	"strings"
	"unicode"
)

// Match kinds reported to the client so the player can say why a piece was
// (or was not) found in the player's own library.
const (
	PlaylistMatchOwn      = "own"      // program points at a note the player owns
	PlaylistMatchWikidata = "wikidata" // same Wikidata work in the player's library
	PlaylistMatchTitle    = "title"    // same normalized title in the player's library
	PlaylistMatchNone     = "none"     // nothing playable found
)

// PlaylistLibraryNote is the slice of a library note the matcher needs.
type PlaylistLibraryNote struct {
	ID         string
	Name       string
	WikidataID string
	HasPDF     bool
}

// PlaylistProgramEntry is one program row plus what is known about its source note.
type PlaylistProgramEntry struct {
	EntryID          string
	Title            string
	NoteID           string // empty for free-text entries
	SourceWikidataID string // wikidata id of the (usually conductor's) source note
}

// PlaylistMatch is the resolution of one program entry against a player's library.
type PlaylistMatch struct {
	NoteID       string // empty when nothing matched
	PDFAvailable bool
	Kind         string
}

// normalizeTitle folds case, umlauts/diacritics, punctuation and whitespace so
// "Böhmischer Traum!" and "bohmischer  traum" compare equal.
func normalizeTitle(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = strings.NewReplacer("ä", "a", "ö", "o", "ü", "u", "ß", "ss", "é", "e", "è", "e", "à", "a", "á", "a", "ó", "o", "í", "i", "ñ", "n", "ç", "c").Replace(s)
	var b strings.Builder
	space := false
	for _, r := range s {
		switch {
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			if space && b.Len() > 0 {
				b.WriteByte(' ')
			}
			space = false
			b.WriteRune(r)
		default:
			space = true
		}
	}
	return b.String()
}

// MatchProgramToLibrary resolves each program entry to a note in the player's
// own library. Priority: the exact note (if the player owns it), then the same
// Wikidata work, then the same normalized title. Among equal candidates a note
// with a PDF wins, because the player needs something to display.
func MatchProgramToLibrary(entries []PlaylistProgramEntry, library []PlaylistLibraryNote) []PlaylistMatch {
	byID := make(map[string]PlaylistLibraryNote, len(library))
	byWikidata := map[string]PlaylistLibraryNote{}
	byTitle := map[string]PlaylistLibraryNote{}
	better := func(m map[string]PlaylistLibraryNote, key string, n PlaylistLibraryNote) {
		if key == "" {
			return
		}
		if cur, ok := m[key]; !ok || (!cur.HasPDF && n.HasPDF) {
			m[key] = n
		}
	}
	for _, n := range library {
		byID[n.ID] = n
		better(byWikidata, n.WikidataID, n)
		better(byTitle, normalizeTitle(n.Name), n)
	}

	out := make([]PlaylistMatch, len(entries))
	for i, e := range entries {
		if n, ok := byID[e.NoteID]; ok && e.NoteID != "" {
			out[i] = PlaylistMatch{NoteID: n.ID, PDFAvailable: n.HasPDF, Kind: PlaylistMatchOwn}
			continue
		}
		if n, ok := byWikidata[e.SourceWikidataID]; ok && e.SourceWikidataID != "" {
			out[i] = PlaylistMatch{NoteID: n.ID, PDFAvailable: n.HasPDF, Kind: PlaylistMatchWikidata}
			continue
		}
		if n, ok := byTitle[normalizeTitle(e.Title)]; ok && normalizeTitle(e.Title) != "" {
			out[i] = PlaylistMatch{NoteID: n.ID, PDFAvailable: n.HasPDF, Kind: PlaylistMatchTitle}
			continue
		}
		out[i] = PlaylistMatch{Kind: PlaylistMatchNone}
	}
	return out
}
