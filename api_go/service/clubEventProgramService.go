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
