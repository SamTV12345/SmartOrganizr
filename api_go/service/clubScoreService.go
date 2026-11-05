package service

import (
	"api_go/controllers/dto"
	"api_go/db"
	"bytes"
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

var (
	ErrScorePartNotPDF   = errors.New("part must be a PDF file")
	ErrScoreTitleMissing = errors.New("score needs a title")
	ErrScorePartName     = errors.New("part needs a name")
	ErrScoreSection      = errors.New("section does not belong to this club")
)

// ClubScoreService manages the club's sheet music archive: scores (Werke) with
// parts (Stimmen) per instrument section. Managers (Leiter/Co-Leiter) edit it,
// every member may read it and download parts.
type ClubScoreService struct {
	queries *db.Queries
	ctx     context.Context
	members ClubMemberService
}

func NewClubScoreService(queries *db.Queries, members ClubMemberService) ClubScoreService {
	return ClubScoreService{queries: queries, ctx: context.Background(), members: members}
}

func (s *ClubScoreService) requireMember(clubID, userID string) error {
	if _, err := s.members.GetRoleInClub(clubID, userID); err != nil {
		return ErrNoClubAccess
	}
	return nil
}

func (s *ClubScoreService) requireManager(clubID, userID string) error {
	role, err := s.members.GetRoleInClub(clubID, userID)
	if err != nil {
		return ErrNoClubAccess
	}
	if !canManage(role) {
		return ErrManageForbidden
	}
	return nil
}

func trimmedOrNil(v *string) *string {
	if v == nil {
		return nil
	}
	t := strings.TrimSpace(*v)
	if t == "" {
		return nil
	}
	return &t
}

func (s *ClubScoreService) List(clubID, userID string) ([]dto.ClubScoreDto, error) {
	if err := s.requireMember(clubID, userID); err != nil {
		return nil, err
	}
	rows, err := s.queries.ListClubScores(s.ctx, clubID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.ClubScoreDto, 0, len(rows))
	for _, r := range rows {
		out = append(out, dto.ClubScoreDto{
			ID: r.ID, Title: r.Title, Composer: nullStringPtr(r.Composer), Arranger: nullStringPtr(r.Arranger),
			PartCount: int(r.PartCount), CreatedAt: r.CreatedAt.Format(time.RFC3339),
		})
	}
	return out, nil
}

// Get returns one score including its part metadata.
func (s *ClubScoreService) Get(clubID, userID, scoreID string) (dto.ClubScoreDto, error) {
	if err := s.requireMember(clubID, userID); err != nil {
		return dto.ClubScoreDto{}, err
	}
	score, err := s.queries.GetClubScore(s.ctx, db.GetClubScoreParams{ID: scoreID, ClubID: clubID})
	if err != nil {
		return dto.ClubScoreDto{}, err
	}
	rows, err := s.queries.ListClubScoreParts(s.ctx, scoreID)
	if err != nil {
		return dto.ClubScoreDto{}, err
	}
	parts := make([]dto.ClubScorePartDto, 0, len(rows))
	for _, p := range rows {
		parts = append(parts, dto.ClubScorePartDto{
			ID: p.ID, ScoreID: p.ScoreID, Name: p.Name, SectionID: nullStringPtr(p.SectionFk),
			SectionName: nullStringPtr(p.SectionName), Position: int(p.Position), SizeBytes: p.SizeBytes,
		})
	}
	return dto.ClubScoreDto{
		ID: score.ID, Title: score.Title, Composer: nullStringPtr(score.Composer), Arranger: nullStringPtr(score.Arranger),
		PartCount: len(parts), CreatedAt: score.CreatedAt.Format(time.RFC3339), Parts: parts,
	}, nil
}

func (s *ClubScoreService) Create(clubID, userID string, in dto.ClubScorePostDto) (dto.ClubScoreDto, error) {
	if err := s.requireManager(clubID, userID); err != nil {
		return dto.ClubScoreDto{}, err
	}
	title := strings.TrimSpace(in.Title)
	if title == "" {
		return dto.ClubScoreDto{}, ErrScoreTitleMissing
	}
	id := uuid.NewString()
	if err := s.queries.CreateClubScore(s.ctx, db.CreateClubScoreParams{
		ID: id, ClubID: clubID, Title: title,
		Composer: db.NewSQLNullStringNullValue(trimmedOrNil(in.Composer)),
		Arranger: db.NewSQLNullStringNullValue(trimmedOrNil(in.Arranger)),
	}); err != nil {
		return dto.ClubScoreDto{}, err
	}
	return s.Get(clubID, userID, id)
}

func (s *ClubScoreService) Update(clubID, userID, scoreID string, in dto.ClubScorePostDto) (dto.ClubScoreDto, error) {
	if err := s.requireManager(clubID, userID); err != nil {
		return dto.ClubScoreDto{}, err
	}
	title := strings.TrimSpace(in.Title)
	if title == "" {
		return dto.ClubScoreDto{}, ErrScoreTitleMissing
	}
	n, err := s.queries.UpdateClubScore(s.ctx, db.UpdateClubScoreParams{
		Title: title, Composer: db.NewSQLNullStringNullValue(trimmedOrNil(in.Composer)),
		Arranger: db.NewSQLNullStringNullValue(trimmedOrNil(in.Arranger)), ID: scoreID, ClubID: clubID,
	})
	if err != nil {
		return dto.ClubScoreDto{}, err
	}
	if n == 0 {
		// MySQL reports 0 affected rows for an unchanged update too — check existence.
		if _, err := s.queries.GetClubScore(s.ctx, db.GetClubScoreParams{ID: scoreID, ClubID: clubID}); err != nil {
			return dto.ClubScoreDto{}, err
		}
	}
	return s.Get(clubID, userID, scoreID)
}

func (s *ClubScoreService) Delete(clubID, userID, scoreID string) error {
	if err := s.requireManager(clubID, userID); err != nil {
		return err
	}
	n, err := s.queries.DeleteClubScore(s.ctx, db.DeleteClubScoreParams{ID: scoreID, ClubID: clubID})
	if err != nil {
		return err
	}
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (s *ClubScoreService) checkSection(clubID string, sectionID *string) (sql.NullString, error) {
	id := trimmedOrNil(sectionID)
	if id == nil {
		return sql.NullString{}, nil
	}
	if _, err := s.queries.FindClubSection(s.ctx, db.FindClubSectionParams{ID: *id, ClubID: clubID}); err != nil {
		return sql.NullString{}, ErrScoreSection
	}
	return sql.NullString{String: *id, Valid: true}, nil
}

func (s *ClubScoreService) scoreInClub(clubID, scoreID string) error {
	_, err := s.queries.GetClubScore(s.ctx, db.GetClubScoreParams{ID: scoreID, ClubID: clubID})
	return err
}

// AddPart uploads one part PDF. Content must be a real PDF (raw bytes).
func (s *ClubScoreService) AddPart(clubID, userID, scoreID, name string, sectionID *string, content []byte) (dto.ClubScoreDto, error) {
	if err := s.requireManager(clubID, userID); err != nil {
		return dto.ClubScoreDto{}, err
	}
	if err := s.scoreInClub(clubID, scoreID); err != nil {
		return dto.ClubScoreDto{}, err
	}
	name = strings.TrimSpace(name)
	if name == "" {
		return dto.ClubScoreDto{}, ErrScorePartName
	}
	if !bytes.HasPrefix(content, []byte("%PDF")) {
		return dto.ClubScoreDto{}, ErrScorePartNotPDF
	}
	section, err := s.checkSection(clubID, sectionID)
	if err != nil {
		return dto.ClubScoreDto{}, err
	}
	pos, err := s.queries.NextClubScorePartPosition(s.ctx, scoreID)
	if err != nil {
		return dto.ClubScoreDto{}, err
	}
	if err := s.queries.CreateClubScorePart(s.ctx, db.CreateClubScorePartParams{
		ID: uuid.NewString(), ScoreID: scoreID, Name: name, SectionFk: section,
		Position: int32(pos), SizeBytes: int64(len(content)), Content: content,
	}); err != nil {
		return dto.ClubScoreDto{}, err
	}
	return s.Get(clubID, userID, scoreID)
}

func (s *ClubScoreService) UpdatePart(clubID, userID, scoreID, partID string, in dto.ClubScorePartPatchDto) (dto.ClubScoreDto, error) {
	if err := s.requireManager(clubID, userID); err != nil {
		return dto.ClubScoreDto{}, err
	}
	if err := s.scoreInClub(clubID, scoreID); err != nil {
		return dto.ClubScoreDto{}, err
	}
	name := strings.TrimSpace(in.Name)
	if name == "" {
		return dto.ClubScoreDto{}, ErrScorePartName
	}
	section, err := s.checkSection(clubID, in.SectionID)
	if err != nil {
		return dto.ClubScoreDto{}, err
	}
	if _, err := s.queries.UpdateClubScorePart(s.ctx, db.UpdateClubScorePartParams{Name: name, SectionFk: section, ID: partID, ScoreID: scoreID}); err != nil {
		return dto.ClubScoreDto{}, err
	}
	return s.Get(clubID, userID, scoreID)
}

func (s *ClubScoreService) DeletePart(clubID, userID, scoreID, partID string) error {
	if err := s.requireManager(clubID, userID); err != nil {
		return err
	}
	if err := s.scoreInClub(clubID, scoreID); err != nil {
		return err
	}
	n, err := s.queries.DeleteClubScorePart(s.ctx, db.DeleteClubScorePartParams{ID: partID, ScoreID: scoreID})
	if err != nil {
		return err
	}
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// PartPDF returns a part's PDF for any member of the club.
func (s *ClubScoreService) PartPDF(clubID, userID, scoreID, partID string) ([]byte, error) {
	if err := s.requireMember(clubID, userID); err != nil {
		return nil, err
	}
	return s.queries.GetClubScorePartContent(s.ctx, db.GetClubScorePartContentParams{ID: partID, ScoreID: scoreID, ClubID: clubID})
}

// ChoosePart remembers which part the member plays for this score.
func (s *ClubScoreService) ChoosePart(clubID, userID, scoreID, partID string) error {
	if err := s.requireMember(clubID, userID); err != nil {
		return err
	}
	if _, err := s.queries.GetClubScorePartContent(s.ctx, db.GetClubScorePartContentParams{ID: partID, ScoreID: scoreID, ClubID: clubID}); err != nil {
		return err
	}
	return s.queries.UpsertClubScorePartChoice(s.ctx, db.UpsertClubScorePartChoiceParams{ScoreID: scoreID, UserID: userID, PartID: partID})
}

// memberSelections resolves, for one member, the part per score of the club.
func (s *ClubScoreService) memberSelections(clubID, userID string) (map[string]ScorePartSelection, map[string]string, error) {
	participant, err := s.members.GetParticipant(clubID, userID)
	if err != nil {
		return nil, nil, ErrNoClubAccess
	}
	parts, err := s.queries.ListClubScorePartsForClub(s.ctx, clubID)
	if err != nil {
		return nil, nil, err
	}
	choices, err := s.queries.ListClubScorePartChoicesForUser(s.ctx, db.ListClubScorePartChoicesForUserParams{UserID: userID, ClubID: clubID})
	if err != nil {
		return nil, nil, err
	}
	chosen := make(map[string]string, len(choices))
	for _, c := range choices {
		chosen[c.ScoreID] = c.PartID
	}
	byScore := map[string][]ScorePartInfo{}
	names := map[string]string{}
	for _, p := range parts {
		byScore[p.ScoreID] = append(byScore[p.ScoreID], ScorePartInfo{ID: p.ID, Name: p.Name, SectionID: p.SectionFk.String})
		names[p.ID] = p.Name
	}
	out := make(map[string]ScorePartSelection, len(byScore))
	for scoreID, ps := range byScore {
		out[scoreID] = SelectScorePart(ps, participant.SectionFk.String, chosen[scoreID])
	}
	return out, names, nil
}
