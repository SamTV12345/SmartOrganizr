package service

import (
	"api_go/controllers/dto"
	"api_go/db"
	"context"
	"database/sql"
	"errors"
	"strings"

	"github.com/google/uuid"
)

// ClubEventProgramService manages the ordered setlist ("Programm") of a club
// event. Editing reuses the event-management role (Admin/CoAdmin); any member
// may view. The whole program is replaced wholesale on write.
type ClubEventProgramService struct {
	queries *db.Queries
	ctx     context.Context
	members ClubMemberService
}

func NewClubEventProgramService(queries *db.Queries, members ClubMemberService) ClubEventProgramService {
	return ClubEventProgramService{queries: queries, ctx: context.Background(), members: members}
}

func (s *ClubEventProgramService) requireMember(clubID, userID string) error {
	if _, err := s.members.GetRoleInClub(clubID, userID); err != nil {
		return ErrNoClubAccess
	}
	return nil
}

func (s *ClubEventProgramService) requireManager(clubID, userID string) error {
	role, err := s.members.GetRoleInClub(clubID, userID)
	if err != nil {
		return ErrNoClubAccess
	}
	if !canManage(role) {
		return ErrManageForbidden
	}
	return nil
}

// eventInClub verifies the event exists and belongs to the club.
func (s *ClubEventProgramService) eventInClub(clubID, eventID string) error {
	if _, err := s.queries.GetClubEventByID(s.ctx, db.GetClubEventByIDParams{ID: eventID, ClubID: clubID}); err != nil {
		return errors.New("event not found")
	}
	return nil
}

// List returns the ordered program for an event (members may view).
func (s *ClubEventProgramService) List(clubID, userID, eventID string) ([]dto.ClubEventProgramEntryDto, error) {
	if err := s.requireMember(clubID, userID); err != nil {
		return nil, err
	}
	if err := s.eventInClub(clubID, eventID); err != nil {
		return nil, err
	}
	rows, err := s.queries.ListEventProgram(s.ctx, eventID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.ClubEventProgramEntryDto, 0, len(rows))
	for _, r := range rows {
		out = append(out, dto.ClubEventProgramEntryDto{
			ID:              r.ID,
			NoteID:          nullStringPtr(r.NoteID),
			Title:           r.Title,
			Position:        int(r.Position),
			DurationMinutes: nullInt32Ptr(r.DurationMinutes),
			NoteText:        nullStringPtr(r.NoteText),
			ScoreID:         nullStringPtr(r.ScoreID),
		})
	}
	return out, nil
}

// Replace overwrites the event's whole program with the given ordered entries
// (manager only). Position is assigned by array order, ignoring any client value.
func (s *ClubEventProgramService) Replace(clubID, userID, eventID string, in dto.ClubEventProgramReplaceDto) ([]dto.ClubEventProgramEntryDto, error) {
	if err := s.requireManager(clubID, userID); err != nil {
		return nil, err
	}
	if err := s.eventInClub(clubID, eventID); err != nil {
		return nil, err
	}
	for i := range in.Entries {
		if strings.TrimSpace(in.Entries[i].Title) == "" {
			return nil, errors.New("each program entry needs a title")
		}
		// A linked score must belong to this club.
		if id := trimmedOrNil(in.Entries[i].ScoreID); id != nil {
			if _, err := s.queries.GetClubScore(s.ctx, db.GetClubScoreParams{ID: *id, ClubID: clubID}); err != nil {
				return nil, errors.New("program entry links an unknown score")
			}
		}
	}
	// ponytail: delete-all + re-insert. Not transactional (queries has no tx handle
	// here); a concurrent edit could interleave, acceptable for a manager-only setlist.
	if err := s.queries.DeleteEventProgram(s.ctx, eventID); err != nil {
		return nil, err
	}
	for i, e := range in.Entries {
		// An empty-string noteId means "no library note" — store NULL, not "", so the FK holds.
		noteID := e.NoteID
		if noteID != nil && strings.TrimSpace(*noteID) == "" {
			noteID = nil
		}
		if err := s.queries.CreateEventProgramEntry(s.ctx, db.CreateEventProgramEntryParams{
			ID:              uuid.NewString(),
			EventID:         eventID,
			NoteID:          db.NewSQLNullStringNullValue(noteID),
			Title:           strings.TrimSpace(e.Title),
			Position:        int32(i),
			DurationMinutes: nullableInt32(e.DurationMinutes),
			NoteText:        db.NewSQLNullStringNullValue(e.NoteText),
			ScoreID:         db.NewSQLNullStringNullValue(trimmedOrNil(e.ScoreID)),
		}); err != nil {
			return nil, err
		}
	}
	return s.List(clubID, userID, eventID)
}

func nullStringPtr(v sql.NullString) *string {
	if !v.Valid {
		return nil
	}
	s := v.String
	return &s
}

func nullInt32Ptr(v sql.NullInt32) *int {
	if !v.Valid {
		return nil
	}
	i := int(v.Int32)
	return &i
}

func nullableInt32(v *int) sql.NullInt32 {
	if v == nil {
		return sql.NullInt32{}
	}
	return sql.NullInt32{Int32: int32(*v), Valid: true}
}

// Playlist returns the event program resolved to the requesting member's own
// notes (see MatchProgramToLibrary), ready for the play mode.
func (s *ClubEventProgramService) Playlist(clubID, userID, eventID string) ([]dto.ClubEventPlaylistItemDto, error) {
	if err := s.requireMember(clubID, userID); err != nil {
		return nil, err
	}
	if err := s.eventInClub(clubID, eventID); err != nil {
		return nil, err
	}
	rows, err := s.queries.ListEventProgramWithSource(s.ctx, eventID)
	if err != nil {
		return nil, err
	}
	notes, err := s.queries.ListPlayableNotesForUser(s.ctx, sql.NullString{String: userID, Valid: true})
	if err != nil {
		return nil, err
	}
	library := make([]PlaylistLibraryNote, 0, len(notes))
	for _, n := range notes {
		library = append(library, PlaylistLibraryNote{ID: n.ID, Name: n.Name.String, WikidataID: n.WikidataID.String, HasPDF: n.HasPdf == 1})
	}
	entries := make([]PlaylistProgramEntry, 0, len(rows))
	for _, r := range rows {
		entries = append(entries, PlaylistProgramEntry{EntryID: r.ID, Title: r.Title, NoteID: r.NoteID.String, SourceWikidataID: r.SourceWikidataID.String})
	}
	matches := MatchProgramToLibrary(entries, library)
	scores := ClubScoreService{queries: s.queries, ctx: s.ctx, members: s.members}
	selections, partNames, err := scores.memberSelections(clubID, userID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.ClubEventPlaylistItemDto, 0, len(rows))
	for i, r := range rows {
		item := dto.ClubEventPlaylistItemDto{
			EntryID:      r.ID,
			Title:        r.Title,
			Position:     int(r.Position),
			NoteText:     nullStringPtr(r.NoteText),
			PdfAvailable: matches[i].PDFAvailable,
			Match:        matches[i].Kind,
		}
		if matches[i].NoteID != "" {
			id := matches[i].NoteID
			item.NoteID = &id
		}
		applyScoreSelection(&item, r.ScoreID, selections, partNames)
		out = append(out, item)
	}
	return out, nil
}

// applyScoreSelection lets a club score override the library match: the
// member's part wins. A score whose parts fit nobody automatically asks the
// member to choose ("choosePart") unless the library had a playable match.
// A score without any parts leaves the library match untouched.
func applyScoreSelection(item *dto.ClubEventPlaylistItemDto, scoreID sql.NullString, selections map[string]ScorePartSelection, partNames map[string]string) {
	if !scoreID.Valid {
		return
	}
	sid := scoreID.String
	item.ScoreID = &sid
	sel, ok := selections[sid]
	if !ok || len(sel.Options) == 0 {
		return
	}
	item.Parts = make([]dto.ClubEventPlaylistPartDto, 0, len(sel.Options))
	for _, o := range sel.Options {
		item.Parts = append(item.Parts, dto.ClubEventPlaylistPartDto{ID: o.ID, Name: o.Name, OwnSection: o.OwnSection})
	}
	if sel.PartID != "" {
		pid, pname := sel.PartID, partNames[sel.PartID]
		item.PartID, item.PartName = &pid, &pname
		item.NoteID = nil
		item.PdfAvailable = true
		item.Match = "part"
		return
	}
	if !item.PdfAvailable {
		item.NoteID = nil
		item.Match = "choosePart"
	}
}
