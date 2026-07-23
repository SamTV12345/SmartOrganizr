package service

import (
	"api_go/controllers/dto"
	"api_go/db"
	"context"
	"time"
)

// ClubStatsService serves read-only attendance statistics for a club. See
// docs/superpowers/specs/2026-07-23-club-attendance-stats-design.md.
//
// Permissions: any club member may read the stats (mirrors ClubSectionService.List).
// The feature is read-only, so there is nothing to gate beyond membership.
type ClubStatsService struct {
	queries *db.Queries
	ctx     context.Context
	members ClubMemberService
}

func NewClubStatsService(queries *db.Queries, members ClubMemberService) ClubStatsService {
	return ClubStatsService{queries: queries, ctx: context.Background(), members: members}
}

const defaultAttendanceWindowDays = 90

// Attendance returns per-member rates plus per-section aggregates for a club.
// windowDays<=0 falls back to the 90-day default.
func (s *ClubStatsService) Attendance(clubID, userID string, windowDays int) (dto.AttendanceStatsDto, error) {
	if _, err := s.members.GetRoleInClub(clubID, userID); err != nil {
		return dto.AttendanceStatsDto{}, ErrNoClubAccess
	}
	if windowDays <= 0 {
		windowDays = defaultAttendanceWindowDays
	}
	windowStart := time.Now().AddDate(0, 0, -windowDays)

	rows, err := s.queries.MemberAttendanceStats(s.ctx, db.MemberAttendanceStatsParams{
		WindowStart: windowStart,
		ClubID:      clubID,
	})
	if err != nil {
		return dto.AttendanceStatsDto{}, err
	}

	out := dto.AttendanceStatsDto{
		WindowDays: windowDays,
		Members:    make([]dto.MemberAttendanceDto, 0, len(rows)),
		Sections:   []dto.SectionAttendanceDto{},
	}

	// Fold section aggregates from the member rows: summing member-event pairs
	// yields an average attendance per section. Members without a section land
	// in the "" bucket (labelled by the controller/UI as "Ohne Register").
	type sectionAgg struct {
		name                                                            string
		members, eligTotal, attTotal, eligWindow, attWindow             int
	}
	order := make([]string, 0)
	byID := make(map[string]*sectionAgg)

	for _, r := range rows {
		m := dto.MemberAttendanceDto{
			UserID:         r.UserID,
			DisplayName:    buildDisplayName(r.Firstname.String, r.Lastname.String, r.Username.String, r.UserID),
			SectionID:      r.SectionID.String,
			SectionName:    r.SectionName.String,
			EligibleTotal:  int(r.EligibleTotal),
			AttendedTotal:  int(r.AttendedTotal),
			RateTotal:      rate(r.AttendedTotal, r.EligibleTotal),
			EligibleWindow: int(r.EligibleWindow),
			AttendedWindow: int(r.AttendedWindow),
			RateWindow:     rate(r.AttendedWindow, r.EligibleWindow),
		}
		out.Members = append(out.Members, m)

		agg, ok := byID[m.SectionID]
		if !ok {
			agg = &sectionAgg{name: m.SectionName}
			byID[m.SectionID] = agg
			order = append(order, m.SectionID)
		}
		agg.members++
		agg.eligTotal += m.EligibleTotal
		agg.attTotal += m.AttendedTotal
		agg.eligWindow += m.EligibleWindow
		agg.attWindow += m.AttendedWindow
	}

	for _, id := range order {
		agg := byID[id]
		out.Sections = append(out.Sections, dto.SectionAttendanceDto{
			SectionID:      id,
			SectionName:    agg.name,
			MemberCount:    agg.members,
			EligibleTotal:  agg.eligTotal,
			AttendedTotal:  agg.attTotal,
			RateTotal:      rate(int64(agg.attTotal), int64(agg.eligTotal)),
			EligibleWindow: agg.eligWindow,
			AttendedWindow: agg.attWindow,
			RateWindow:     rate(int64(agg.attWindow), int64(agg.eligWindow)),
		})
	}
	return out, nil
}

// rate is attended/eligible as a 0..1 fraction; 0 eligible events -> 0.
func rate(attended, eligible int64) float64 {
	if eligible <= 0 {
		return 0
	}
	return float64(attended) / float64(eligible)
}
