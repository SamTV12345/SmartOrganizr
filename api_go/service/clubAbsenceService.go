package service

import (
	"api_go/controllers/dto"
	"api_go/db"
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

const absenceDateLayout = "2006-01-02"

type ClubAbsenceService struct {
	queries *db.Queries
	ctx     context.Context
	members ClubMemberService
}

func NewClubAbsenceService(queries *db.Queries, members ClubMemberService) ClubAbsenceService {
	return ClubAbsenceService{queries: queries, ctx: context.Background(), members: members}
}

func (s *ClubAbsenceService) requireMember(clubID, userID string) error {
	if _, err := s.members.GetRoleInClub(clubID, userID); err != nil {
		return ErrNoClubAccess
	}
	return nil
}

// parseAbsenceDate accepts a plain calendar day (from <input type="date">) and
// falls back to RFC3339 so an ISO timestamp is tolerated too.
func parseAbsenceDate(value string) (time.Time, error) {
	v := strings.TrimSpace(value)
	if t, err := time.Parse(absenceDateLayout, v); err == nil {
		return t, nil
	}
	if t, err := time.Parse(time.RFC3339, v); err == nil {
		return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC), nil
	}
	return time.Time{}, errors.New("date must be YYYY-MM-DD")
}

// Create inserts an absence for the caller (own absences only).
func (s *ClubAbsenceService) Create(clubID, userID string, in dto.ClubAbsenceUpsertDto) (dto.ClubAbsenceDto, error) {
	if err := s.requireMember(clubID, userID); err != nil {
		return dto.ClubAbsenceDto{}, err
	}
	start, err := parseAbsenceDate(in.StartDate)
	if err != nil {
		return dto.ClubAbsenceDto{}, errors.New("startDate must be YYYY-MM-DD")
	}
	end, err := parseAbsenceDate(in.EndDate)
	if err != nil {
		return dto.ClubAbsenceDto{}, errors.New("endDate must be YYYY-MM-DD")
	}
	if end.Before(start) {
		return dto.ClubAbsenceDto{}, errors.New("endDate must not be before startDate")
	}
	id := uuid.NewString()
	if err := s.queries.CreateClubAbsence(s.ctx, db.CreateClubAbsenceParams{
		ID:        id,
		ClubID:    clubID,
		UserID:    userID,
		StartDate: start,
		EndDate:   end,
		Reason:    nullableString(in.Reason),
	}); err != nil {
		return dto.ClubAbsenceDto{}, err
	}
	row, err := s.queries.GetClubAbsenceByID(s.ctx, db.GetClubAbsenceByIDParams{ID: id, ClubID: clubID})
	if err != nil {
		return dto.ClubAbsenceDto{}, err
	}
	return dto.ClubAbsenceDto{
		ID: row.ID, ClubID: row.ClubID, UserID: row.UserID,
		StartDate: row.StartDate.Format(absenceDateLayout),
		EndDate:   row.EndDate.Format(absenceDateLayout),
		Reason:    row.Reason.String, CreatedAt: row.CreatedAt.Format(time.RFC3339),
	}, nil
}

// ListMine returns the caller's own absences.
func (s *ClubAbsenceService) ListMine(clubID, userID string) ([]dto.ClubAbsenceDto, error) {
	if err := s.requireMember(clubID, userID); err != nil {
		return nil, err
	}
	rows, err := s.queries.ListMyClubAbsences(s.ctx, db.ListMyClubAbsencesParams{ClubID: clubID, UserID: userID})
	if err != nil {
		return nil, err
	}
	out := make([]dto.ClubAbsenceDto, 0, len(rows))
	for _, r := range rows {
		out = append(out, dto.ClubAbsenceDto{
			ID: r.ID, ClubID: r.ClubID, UserID: r.UserID,
			StartDate: r.StartDate.Format(absenceDateLayout),
			EndDate:   r.EndDate.Format(absenceDateLayout),
			Reason:    r.Reason.String, CreatedAt: r.CreatedAt.Format(time.RFC3339),
		})
	}
	return out, nil
}

// ListAll returns every member's absences (managers only).
func (s *ClubAbsenceService) ListAll(clubID, userID string) ([]dto.ClubAbsenceDto, error) {
	role, err := s.members.GetRoleInClub(clubID, userID)
	if err != nil {
		return nil, ErrNoClubAccess
	}
	if !canManage(role) {
		return nil, ErrManageForbidden
	}
	rows, err := s.queries.ListClubAbsences(s.ctx, clubID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.ClubAbsenceDto, 0, len(rows))
	for _, r := range rows {
		out = append(out, dto.ClubAbsenceDto{
			ID: r.ID, ClubID: r.ClubID, UserID: r.UserID,
			DisplayName: buildDisplayName(r.Firstname.String, r.Lastname.String, r.Username.String, r.UserID),
			StartDate:   r.StartDate.Format(absenceDateLayout),
			EndDate:     r.EndDate.Format(absenceDateLayout),
			Reason:      r.Reason.String, CreatedAt: r.CreatedAt.Format(time.RFC3339),
		})
	}
	return out, nil
}

// Delete removes one of the caller's own absences.
func (s *ClubAbsenceService) Delete(clubID, userID, absenceID string) error {
	if err := s.requireMember(clubID, userID); err != nil {
		return err
	}
	affected, err := s.queries.DeleteClubAbsence(s.ctx, db.DeleteClubAbsenceParams{
		ID: absenceID, ClubID: clubID, UserID: userID,
	})
	if err != nil {
		return err
	}
	if affected == 0 {
		return errors.New("absence not found")
	}
	return nil
}

// Availability returns per-member inferred availability for an event: an explicit
// RSVP always wins; otherwise an absence overlapping the event date marks the
// member unavailable; everyone else is assumed present.
func (s *ClubAbsenceService) Availability(clubID, userID, eventID string) (dto.EventAvailabilityDto, error) {
	if err := s.requireMember(clubID, userID); err != nil {
		return dto.EventAvailabilityDto{}, err
	}
	ev, err := s.queries.GetClubEventByID(s.ctx, db.GetClubEventByIDParams{ID: eventID, ClubID: clubID})
	if err != nil {
		return dto.EventAvailabilityDto{}, errors.New("event not found")
	}
	members, err := s.members.GetAllMembersForClub(clubID)
	if err != nil {
		return dto.EventAvailabilityDto{}, err
	}
	responses, err := s.queries.ListClubEventResponses(s.ctx, eventID)
	if err != nil {
		return dto.EventAvailabilityDto{}, err
	}
	status := make(map[string]string, len(responses))
	for _, r := range responses {
		status[r.UserID] = r.Status
	}
	absentUsers, err := s.queries.ListClubAbsencesCoveringDate(s.ctx, db.ListClubAbsencesCoveringDateParams{
		ClubID: clubID, OnDate: ev.StartDate,
	})
	if err != nil {
		return dto.EventAvailabilityDto{}, err
	}
	absent := make(map[string]bool, len(absentUsers))
	for _, u := range absentUsers {
		absent[u] = true
	}

	result := dto.EventAvailabilityDto{EventID: eventID, Rows: []dto.EventAvailabilityRowDto{}}
	for _, m := range *members {
		row := dto.EventAvailabilityRowDto{
			UserID:      m.User.UserId,
			DisplayName: buildDisplayName(m.User.Firstname, m.User.Lastname, m.User.Username, m.User.UserId),
		}
		if st, ok := status[m.User.UserId]; ok {
			row.Source = "rsvp"
			row.Status = st
			row.Available = st == "YES" || st == "MAYBE"
		} else if absent[m.User.UserId] {
			row.Source = "absence"
			row.Available = false
		} else {
			row.Source = "assumed"
			row.Available = true
		}
		if row.Available {
			result.ExpectedCount++
		}
		result.Rows = append(result.Rows, row)
	}
	result.TotalCount = len(*members)
	return result, nil
}
