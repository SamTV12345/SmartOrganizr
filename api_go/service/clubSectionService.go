package service

import (
	"api_go/db"
	"api_go/models"
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
)

// ClubSectionService manages instrument sections (Register) per club and the
// members' section assignment. See
// docs/superpowers/specs/2026-07-12-club-sections-design.md.
type ClubSectionService struct {
	queries *db.Queries
	ctx     context.Context
	members ClubMemberService
}

func NewClubSectionService(queries *db.Queries, members ClubMemberService) ClubSectionService {
	return ClubSectionService{queries: queries, ctx: context.Background(), members: members}
}

var ErrSectionNotFound = errors.New("section not found")
var ErrSectionNameTaken = errors.New("a section with this name already exists")

type ClubSection struct {
	ID          string
	Name        string
	MemberCount int
}

func (s *ClubSectionService) requireManager(clubID, userID string) error {
	role, err := s.members.GetRoleInClub(clubID, userID)
	if err != nil {
		return ErrNoClubAccess
	}
	if role != models.Admin && role != models.CoAdmin {
		return ErrManageForbidden
	}
	return nil
}

// List returns the club's sections with member counts (any member may look).
func (s *ClubSectionService) List(clubID, userID string) ([]ClubSection, error) {
	if _, err := s.members.GetRoleInClub(clubID, userID); err != nil {
		return nil, ErrNoClubAccess
	}
	rows, err := s.queries.ListClubSections(s.ctx, clubID)
	if err != nil {
		return nil, err
	}
	out := make([]ClubSection, 0, len(rows))
	for _, r := range rows {
		out = append(out, ClubSection{ID: r.ID, Name: r.Name, MemberCount: int(r.MemberCount)})
	}
	return out, nil
}

func (s *ClubSectionService) Create(clubID, userID, name string) (ClubSection, error) {
	if err := s.requireManager(clubID, userID); err != nil {
		return ClubSection{}, err
	}
	name = strings.TrimSpace(name)
	if name == "" {
		return ClubSection{}, errors.New("name is required")
	}
	id := uuid.NewString()
	if err := s.queries.CreateClubSection(s.ctx, db.CreateClubSectionParams{
		ID: id, ClubID: clubID, Name: name,
	}); err != nil {
		return ClubSection{}, ErrSectionNameTaken
	}
	return ClubSection{ID: id, Name: name}, nil
}

func (s *ClubSectionService) Rename(clubID, userID, sectionID, name string) error {
	if err := s.requireManager(clubID, userID); err != nil {
		return err
	}
	name = strings.TrimSpace(name)
	if name == "" {
		return errors.New("name is required")
	}
	rows, err := s.queries.RenameClubSection(s.ctx, db.RenameClubSectionParams{
		Name: name, ID: sectionID, ClubID: clubID,
	})
	if err != nil {
		return ErrSectionNameTaken
	}
	if rows == 0 {
		// Renaming to the identical name also yields 0 affected rows; only
		// report not-found when the section really doesn't exist.
		if _, err := s.queries.FindClubSection(s.ctx, db.FindClubSectionParams{ID: sectionID, ClubID: clubID}); err != nil {
			return ErrSectionNotFound
		}
	}
	return nil
}

// Delete removes a section; members and events fall back to NULL (whole club)
// via ON DELETE SET NULL.
func (s *ClubSectionService) Delete(clubID, userID, sectionID string) error {
	if err := s.requireManager(clubID, userID); err != nil {
		return err
	}
	rows, err := s.queries.DeleteClubSection(s.ctx, db.DeleteClubSectionParams{ID: sectionID, ClubID: clubID})
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrSectionNotFound
	}
	return nil
}

// AssignMember puts a member into a section (or removes them with an empty
// sectionID) and sets the Registerführer flag. Managers only.
func (s *ClubSectionService) AssignMember(clubID, requesterID, memberUserID string, sectionID *string, sectionLeader bool) error {
	if err := s.requireManager(clubID, requesterID); err != nil {
		return err
	}
	if _, err := s.members.GetParticipant(clubID, memberUserID); err != nil {
		return errors.New("member not found")
	}
	var sectionFk = db.NewSQLNullStringNullValue(nil)
	if sectionID != nil && *sectionID != "" {
		if _, err := s.queries.FindClubSection(s.ctx, db.FindClubSectionParams{ID: *sectionID, ClubID: clubID}); err != nil {
			return ErrSectionNotFound
		}
		sectionFk = db.NewSQLNullString(*sectionID)
	} else {
		// Without a section there is nothing to lead.
		sectionLeader = false
	}
	return s.queries.UpdateClubMemberSection(s.ctx, db.UpdateClubMemberSectionParams{
		SectionFk:     sectionFk,
		SectionLeader: sectionLeader,
		ClubID:        clubID,
		UserID:        memberUserID,
	})
}
