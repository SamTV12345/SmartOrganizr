package tests

import (
	db2 "api_go/db"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"testing"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type memberAttendance struct {
	UserID        string  `json:"userId"`
	SectionID     string  `json:"sectionId"`
	SectionName   string  `json:"sectionName"`
	EligibleTotal int     `json:"eligibleTotal"`
	AttendedTotal int     `json:"attendedTotal"`
	RateTotal     float64 `json:"rateTotal"`
}

type sectionAttendance struct {
	SectionID     string  `json:"sectionId"`
	SectionName   string  `json:"sectionName"`
	MemberCount   int     `json:"memberCount"`
	EligibleTotal int     `json:"eligibleTotal"`
	AttendedTotal int     `json:"attendedTotal"`
	RateTotal     float64 `json:"rateTotal"`
}

type attendanceStats struct {
	WindowDays int                 `json:"windowDays"`
	Members    []memberAttendance  `json:"members"`
	Sections   []sectionAttendance `json:"sections"`
}

// seedPastEvent inserts a past (or, with cancelled, a past cancelled) event
// directly, bypassing the API which only accepts future start dates.
func seedPastEvent(t *testing.T, clubID string, daysAgo int, sectionFk *string, cancelled bool) string {
	t.Helper()
	ctx := context.Background()
	id := uuid.NewString()
	if err := testQueries.CreateClubEvent(ctx, db2.CreateClubEventParams{
		ID:              id,
		ClubID:          clubID,
		Summary:         "Past event",
		EventType:       "REHEARSAL",
		StartDate:       time.Now().AddDate(0, 0, -daysAgo),
		CreatedByUserID: "12345",
		SectionFk:       db2.NewSQLNullStringNullValue(sectionFk),
	}); err != nil {
		t.Fatalf("seed past event: %v", err)
	}
	if cancelled {
		if err := testQueries.SoftCancelClubEvent(ctx, db2.SoftCancelClubEventParams{ID: id, ClubID: clubID}); err != nil {
			t.Fatalf("cancel seeded event: %v", err)
		}
	}
	return id
}

func seedResponse(t *testing.T, eventID, userID, status string) {
	t.Helper()
	if err := testQueries.UpsertClubEventResponse(context.Background(), db2.UpsertClubEventResponseParams{
		EventID: eventID, UserID: userID, Status: status,
	}); err != nil {
		t.Fatalf("seed response: %v", err)
	}
}

func getAttendanceStats(t *testing.T, app *fiber.App, clubID string) attendanceStats {
	t.Helper()
	res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/stats/attendance")
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("stats: expected 200, got %d: %s", res.StatusCode, string(raw))
	}
	var stats attendanceStats
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &stats); err != nil {
		t.Fatalf("decode stats: %v (%s)", err, string(raw))
	}
	return stats
}

func TestAttendanceStats(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app) // user "12345" is LEITER, no section

	flutes := createSection(t, app, clubID, "Flöten")
	seedClubMember(t, clubID, "alice", "MITGLIED")
	seedClubMember(t, clubID, "bob", "MITGLIED")
	assignSection(t, app, clubID, "alice", &flutes, false, http.StatusNoContent)
	// bob stays without a section.

	// Two whole-club past events, one Flöten-only past event.
	e1 := seedPastEvent(t, clubID, 10, nil, false)
	e2 := seedPastEvent(t, clubID, 20, nil, false)
	e3 := seedPastEvent(t, clubID, 5, &flutes, false)
	// Noise that must be ignored: a cancelled past event and a future event.
	seedPastEvent(t, clubID, 3, nil, true)
	seedPastEvent(t, clubID, -5, nil, false)

	// Responses. bob never responds (0% edge case).
	seedResponse(t, e1, "12345", "YES")
	seedResponse(t, e2, "12345", "NO")
	seedResponse(t, e1, "alice", "YES")
	seedResponse(t, e3, "alice", "YES")

	stats := getAttendanceStats(t, app, clubID)

	if stats.WindowDays != 90 {
		t.Fatalf("expected default window 90, got %d", stats.WindowDays)
	}
	if len(stats.Members) != 3 {
		t.Fatalf("expected 3 members, got %+v", stats.Members)
	}

	byUser := map[string]memberAttendance{}
	for _, m := range stats.Members {
		byUser[m.UserID] = m
	}

	// 12345 (no section): eligible = 2 whole-club events; attended 1 (YES to e1).
	if got := byUser["12345"]; got.EligibleTotal != 2 || got.AttendedTotal != 1 || got.RateTotal != 0.5 {
		t.Fatalf("leiter stats wrong: %+v", got)
	}
	// alice (Flöten): eligible = 2 whole-club + 1 section = 3; attended 2.
	if got := byUser["alice"]; got.EligibleTotal != 3 || got.AttendedTotal != 2 {
		t.Fatalf("alice stats wrong: %+v", got)
	}
	// bob (no section, no responses): eligible 2, attended 0, rate 0.
	if got := byUser["bob"]; got.EligibleTotal != 2 || got.AttendedTotal != 0 || got.RateTotal != 0 {
		t.Fatalf("bob (zero-response) stats wrong: %+v", got)
	}

	bySection := map[string]sectionAttendance{}
	for _, s := range stats.Sections {
		bySection[s.SectionID] = s
	}
	// Flöten section: only alice — eligible 3, attended 2.
	if got := bySection[flutes]; got.MemberCount != 1 || got.EligibleTotal != 3 || got.AttendedTotal != 2 {
		t.Fatalf("Flöten section aggregate wrong: %+v", got)
	}
	// No-section bucket: 12345 + bob still aggregate here (empty sectionId).
	if got := bySection[""]; got.MemberCount != 2 || got.EligibleTotal != 4 || got.AttendedTotal != 1 {
		t.Fatalf("no-section aggregate wrong: %+v", got)
	}
}

func TestAttendanceStatsRequiresMembership(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)

	// Non-member (unknown club) is rejected; a member gets 200.
	if res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/does-not-exist/stats/attendance"); res.StatusCode != http.StatusForbidden {
		t.Fatalf("non-member expected 403, got %d", res.StatusCode)
	}
	if res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/stats/attendance"); res.StatusCode != http.StatusOK {
		t.Fatalf("member expected 200, got %d", res.StatusCode)
	}
}
