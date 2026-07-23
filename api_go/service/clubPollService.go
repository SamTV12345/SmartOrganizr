package service

import (
	"api_go/controllers/dto"
	"api_go/db"
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

type ClubPollService struct {
	queries *db.Queries
	ctx     context.Context
	members ClubMemberService
}

func NewClubPollService(queries *db.Queries, members ClubMemberService) ClubPollService {
	return ClubPollService{queries: queries, ctx: context.Background(), members: members}
}

// requireMember / requireManager mirror ClubEventService's gates. canManage is a
// package-level helper shared with the event service.
func (s *ClubPollService) requireMember(clubID, userID string) error {
	if _, err := s.members.GetRoleInClub(clubID, userID); err != nil {
		return ErrNoClubAccess
	}
	return nil
}

func (s *ClubPollService) requireManager(clubID, userID string) error {
	role, err := s.members.GetRoleInClub(clubID, userID)
	if err != nil {
		return ErrNoClubAccess
	}
	if !canManage(role) {
		return ErrManageForbidden
	}
	return nil
}

// Create inserts a poll with its options (manager only).
func (s *ClubPollService) Create(clubID, userID string, in dto.ClubPollCreateDto) (dto.ClubPollDto, error) {
	if err := s.requireManager(clubID, userID); err != nil {
		return dto.ClubPollDto{}, err
	}
	if strings.TrimSpace(in.Question) == "" {
		return dto.ClubPollDto{}, errors.New("question is required")
	}
	options := make([]string, 0, len(in.Options))
	for _, o := range in.Options {
		if strings.TrimSpace(o) != "" {
			options = append(options, strings.TrimSpace(o))
		}
	}
	if len(options) < 2 {
		return dto.ClubPollDto{}, errors.New("a poll needs at least two options")
	}
	var nullCloses sql.NullTime
	if in.ClosesAt != nil {
		var err error
		nullCloses, err = parseRFC3339(*in.ClosesAt)
		if err != nil {
			return dto.ClubPollDto{}, errors.New("closesAt must be a valid RFC3339 timestamp")
		}
	}

	pollID := uuid.NewString()
	if err := s.queries.CreateClubPoll(s.ctx, db.CreateClubPollParams{
		ID:              pollID,
		ClubID:          clubID,
		Question:        strings.TrimSpace(in.Question),
		CreatedByUserID: userID,
		MultipleChoice:  in.MultipleChoice,
		ClosesAt:        nullCloses,
	}); err != nil {
		return dto.ClubPollDto{}, err
	}
	for i, label := range options {
		if err := s.queries.CreateClubPollOption(s.ctx, db.CreateClubPollOptionParams{
			ID:       uuid.NewString(),
			PollID:   pollID,
			Label:    label,
			Position: int32(i),
		}); err != nil {
			return dto.ClubPollDto{}, err
		}
	}
	return s.getOne(clubID, userID, pollID)
}

// List returns all polls of a club with the caller's votes and counts.
func (s *ClubPollService) List(clubID, userID string) ([]dto.ClubPollDto, error) {
	if err := s.requireMember(clubID, userID); err != nil {
		return nil, err
	}
	polls, err := s.queries.ListClubPolls(s.ctx, clubID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.ClubPollDto, 0, len(polls))
	for _, p := range polls {
		poll, err := s.buildPollDto(p, userID)
		if err != nil {
			return nil, err
		}
		out = append(out, poll)
	}
	return out, nil
}

// Vote replaces the caller's votes for a poll. Single-choice polls accept exactly
// one option; multiple-choice accept one or more. Delete-then-insert enforces the
// single-choice replacement invariant.
func (s *ClubPollService) Vote(clubID, userID, pollID string, in dto.ClubPollVoteDto) error {
	if err := s.requireMember(clubID, userID); err != nil {
		return err
	}
	poll, err := s.queries.GetClubPollByID(s.ctx, db.GetClubPollByIDParams{ID: pollID, ClubID: clubID})
	if err != nil {
		return errors.New("poll not found")
	}
	if poll.Closed {
		return errors.New("poll is closed")
	}
	// Dedupe the ballot so a client can't stuff the same option twice.
	seen := make(map[string]bool, len(in.OptionIds))
	optionIDs := make([]string, 0, len(in.OptionIds))
	for _, id := range in.OptionIds {
		if id == "" || seen[id] {
			continue
		}
		seen[id] = true
		optionIDs = append(optionIDs, id)
	}
	if len(optionIDs) == 0 {
		return errors.New("select at least one option")
	}
	if !poll.MultipleChoice && len(optionIDs) != 1 {
		return errors.New("this poll allows only one choice")
	}
	for _, id := range optionIDs {
		if _, err := s.queries.FindClubPollOption(s.ctx, db.FindClubPollOptionParams{ID: id, PollID: pollID}); err != nil {
			return errors.New("option does not belong to this poll")
		}
	}
	if err := s.queries.DeleteUserClubPollVotes(s.ctx, db.DeleteUserClubPollVotesParams{PollID: pollID, UserID: userID}); err != nil {
		return err
	}
	for _, id := range optionIDs {
		if err := s.queries.InsertClubPollVote(s.ctx, db.InsertClubPollVoteParams{PollID: pollID, OptionID: id, UserID: userID}); err != nil {
			return err
		}
	}
	return nil
}

// Close marks a poll closed (manager only).
func (s *ClubPollService) Close(clubID, userID, pollID string) error {
	if err := s.requireManager(clubID, userID); err != nil {
		return err
	}
	rows, err := s.queries.CloseClubPoll(s.ctx, db.CloseClubPollParams{ID: pollID, ClubID: clubID})
	if err != nil {
		return err
	}
	if rows == 0 {
		return errors.New("poll not found")
	}
	return nil
}

// Delete removes a poll and (via FK cascade) its options and votes (manager only).
func (s *ClubPollService) Delete(clubID, userID, pollID string) error {
	if err := s.requireManager(clubID, userID); err != nil {
		return err
	}
	rows, err := s.queries.DeleteClubPoll(s.ctx, db.DeleteClubPollParams{ID: pollID, ClubID: clubID})
	if err != nil {
		return err
	}
	if rows == 0 {
		return errors.New("poll not found")
	}
	return nil
}

func (s *ClubPollService) getOne(clubID, userID, pollID string) (dto.ClubPollDto, error) {
	p, err := s.queries.GetClubPollByID(s.ctx, db.GetClubPollByIDParams{ID: pollID, ClubID: clubID})
	if err != nil {
		return dto.ClubPollDto{}, err
	}
	return s.buildPollDto(p, userID)
}

func (s *ClubPollService) buildPollDto(p db.ClubPoll, userID string) (dto.ClubPollDto, error) {
	options, err := s.queries.ListClubPollOptionsWithCounts(s.ctx, db.ListClubPollOptionsWithCountsParams{
		UserID: userID, PollID: p.ID,
	})
	if err != nil {
		return dto.ClubPollDto{}, err
	}
	out := dto.ClubPollDto{
		ID:             p.ID,
		ClubID:         p.ClubID,
		Question:       p.Question,
		MultipleChoice: p.MultipleChoice,
		Closed:         p.Closed,
		ClosesAt:       nullTimeRFC(p.ClosesAt),
		CreatedAt:      p.CreatedAt.Format(time.RFC3339),
		CreatedBy:      p.CreatedByUserID,
		Options:        make([]dto.ClubPollOptionDto, 0, len(options)),
	}
	for _, o := range options {
		out.TotalVotes += int(o.VoteCount)
		out.Options = append(out.Options, dto.ClubPollOptionDto{
			ID:        o.ID,
			Label:     o.Label,
			Position:  int(o.Position),
			VoteCount: int(o.VoteCount),
			VotedByMe: o.VotedByMe > 0,
		})
	}
	return out, nil
}
