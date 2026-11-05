package service

import (
	"api_go/controllers/dto"
	"database/sql"
	"testing"
)

var testParts = []ScorePartInfo{
	{ID: "dir", Name: "Direktion"},
	{ID: "kl1", Name: "1. Klarinette", SectionID: "klarinetten"},
	{ID: "kl2", Name: "2. Klarinette", SectionID: "klarinetten"},
	{ID: "tuba", Name: "Tuba", SectionID: "tiefes-blech"},
}

func TestSelectScorePartDefaultsToFirstOwnSectionPart(t *testing.T) {
	sel := SelectScorePart(testParts, "klarinetten", "")
	if sel.PartID != "kl1" {
		t.Fatalf("expected kl1, got %q", sel.PartID)
	}
	if len(sel.Options) != 4 || sel.Options[0].ID != "kl1" || sel.Options[1].ID != "kl2" || !sel.Options[0].OwnSection || sel.Options[2].OwnSection {
		t.Fatalf("own section parts must come first: %+v", sel.Options)
	}
}

func TestSelectScorePartHonoursChoiceEvenAcrossSections(t *testing.T) {
	if sel := SelectScorePart(testParts, "klarinetten", "kl2"); sel.PartID != "kl2" {
		t.Fatalf("expected remembered kl2, got %q", sel.PartID)
	}
	// A tenor horn player who reads the tuba part.
	if sel := SelectScorePart(testParts, "klarinetten", "tuba"); sel.PartID != "tuba" {
		t.Fatalf("expected remembered tuba, got %q", sel.PartID)
	}
}

func TestSelectScorePartIgnoresStaleChoice(t *testing.T) {
	if sel := SelectScorePart(testParts, "klarinetten", "deleted-part"); sel.PartID != "kl1" {
		t.Fatalf("stale choice must fall back to the section default, got %q", sel.PartID)
	}
}

func TestSelectScorePartNeverAutoAssignsUnsectionedParts(t *testing.T) {
	sel := SelectScorePart(testParts, "", "")
	if sel.PartID != "" {
		t.Fatalf("member without section must not get a part automatically, got %q", sel.PartID)
	}
	if len(sel.Options) != 4 {
		t.Fatalf("all parts stay selectable, got %+v", sel.Options)
	}
	if sel := SelectScorePart(testParts, "floeten", ""); sel.PartID != "" {
		t.Fatalf("section without parts gets nothing automatically, got %q", sel.PartID)
	}
}

func TestApplyScoreSelection(t *testing.T) {
	sel := map[string]ScorePartSelection{
		"with-part": SelectScorePart(testParts, "klarinetten", ""),
		"no-fit":    SelectScorePart(testParts, "", ""),
	}
	names := map[string]string{"kl1": "1. Klarinette"}
	libNote := "lib-1"

	t.Run("member part overrides library match", func(t *testing.T) {
		item := dto.ClubEventPlaylistItemDto{NoteID: &libNote, PdfAvailable: true, Match: PlaylistMatchOwn}
		applyScoreSelection(&item, sql.NullString{String: "with-part", Valid: true}, sel, names)
		if item.Match != "part" || item.PartID == nil || *item.PartID != "kl1" || *item.PartName != "1. Klarinette" || item.NoteID != nil || len(item.Parts) != 4 {
			t.Fatalf("unexpected %+v", item)
		}
	})
	t.Run("no fitting part keeps a playable library match", func(t *testing.T) {
		item := dto.ClubEventPlaylistItemDto{NoteID: &libNote, PdfAvailable: true, Match: PlaylistMatchTitle}
		applyScoreSelection(&item, sql.NullString{String: "no-fit", Valid: true}, sel, names)
		if item.Match != PlaylistMatchTitle || item.NoteID == nil || len(item.Parts) != 4 {
			t.Fatalf("unexpected %+v", item)
		}
	})
	t.Run("no fitting part and nothing in the library asks to choose", func(t *testing.T) {
		item := dto.ClubEventPlaylistItemDto{Match: PlaylistMatchNone}
		applyScoreSelection(&item, sql.NullString{String: "no-fit", Valid: true}, sel, names)
		if item.Match != "choosePart" || item.PdfAvailable {
			t.Fatalf("unexpected %+v", item)
		}
	})
	t.Run("score without parts and no score leave the item alone", func(t *testing.T) {
		item := dto.ClubEventPlaylistItemDto{Match: PlaylistMatchNone}
		applyScoreSelection(&item, sql.NullString{String: "empty", Valid: true}, sel, names)
		if item.Match != PlaylistMatchNone || item.ScoreID == nil || *item.ScoreID != "empty" {
			t.Fatalf("unexpected %+v", item)
		}
		plain := dto.ClubEventPlaylistItemDto{Match: PlaylistMatchNone}
		applyScoreSelection(&plain, sql.NullString{}, sel, names)
		if plain.ScoreID != nil {
			t.Fatalf("unexpected %+v", plain)
		}
	})
}
