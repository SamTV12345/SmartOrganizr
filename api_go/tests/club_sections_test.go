package tests

import (
	db2 "api_go/db"
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"testing"
	"time"

	"github.com/gofiber/fiber/v3"
)

type clubSection struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	MemberCount int    `json:"memberCount"`
}

func createSection(t *testing.T, app *fiber.App, clubID, name string) string {
	t.Helper()
	res := postJSON(t, app, "http://localhost/api/v1/clubs/"+clubID+"/sections", map[string]string{"name": name})
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("create section: expected 200, got %d: %s", res.StatusCode, string(raw))
	}
	var section clubSection
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &section); err != nil || section.ID == "" {
		t.Fatalf("decode section: %v (%s)", err, string(raw))
	}
	return section.ID
}

func assignSection(t *testing.T, app *fiber.App, clubID, userID string, sectionID *string, leader bool, wantStatus int) {
	t.Helper()
	body := map[string]any{"sectionId": sectionID, "sectionLeader": leader}
	encoded, _ := json.Marshal(body)
	req, _ := http.NewRequest("PATCH", "http://localhost/api/v1/clubs/"+clubID+"/members/"+userID+"/section", bytes.NewBuffer(encoded))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("assign section: %v", err)
	}
	if res.StatusCode != wantStatus {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("assign section: expected %d, got %d: %s", wantStatus, res.StatusCode, string(raw))
	}
}

func createSectionEvent(t *testing.T, app *fiber.App, clubID, summary, sectionID string) string {
	t.Helper()
	start := time.Now().Add(48 * time.Hour).Format(time.RFC3339)
	body := `{"summary":"` + summary + `","eventType":"REHEARSAL","startDate":"` + start + `","sectionId":"` + sectionID + `"}`
	req, _ := http.NewRequest("POST", "http://localhost/api/v1/clubs/"+clubID+"/events", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("create section event: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("create section event: expected 200, got %d: %s", res.StatusCode, string(raw))
	}
	var ev struct {
		ID          string `json:"id"`
		SectionID   string `json:"sectionId"`
		SectionName string `json:"sectionName"`
	}
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &ev); err != nil || ev.ID == "" {
		t.Fatalf("decode event: %v (%s)", err, string(raw))
	}
	if ev.SectionID != sectionID || ev.SectionName == "" {
		t.Fatalf("expected section on created event, got %+v", ev)
	}
	return ev.ID
}

func listClubEvents(t *testing.T, app *fiber.App, clubID string) []clubEvent {
	t.Helper()
	res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/events")
	if res.StatusCode != http.StatusOK {
		t.Fatalf("list events: expected 200, got %d", res.StatusCode)
	}
	var events []clubEvent
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &events); err != nil {
		t.Fatalf("decode events: %v", err)
	}
	return events
}

func TestSectionCrudAndPermissions(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)

	fluteID := createSection(t, app, clubID, "Flöten")
	createSection(t, app, clubID, "Klarinetten")

	// Duplicate name conflicts.
	if res := postJSON(t, app, "http://localhost/api/v1/clubs/"+clubID+"/sections", map[string]string{"name": "Flöten"}); res.StatusCode != http.StatusConflict {
		t.Fatalf("duplicate section: expected 409, got %d", res.StatusCode)
	}

	// Rename.
	renameReq, _ := http.NewRequest("PUT", "http://localhost/api/v1/clubs/"+clubID+"/sections/"+fluteID, bytes.NewBufferString(`{"name":"Querflöten"}`))
	renameReq.Header.Set("Content-Type", "application/json")
	if res, _ := app.Test(renameReq); res.StatusCode != http.StatusNoContent {
		t.Fatalf("rename: expected 204, got %d", res.StatusCode)
	}

	// List shows both with counts.
	res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/sections")
	if res.StatusCode != http.StatusOK {
		t.Fatalf("list sections: expected 200, got %d", res.StatusCode)
	}
	var sections []clubSection
	raw, _ := io.ReadAll(res.Body)
	_ = json.Unmarshal(raw, &sections)
	if len(sections) != 2 {
		t.Fatalf("expected 2 sections, got %+v", sections)
	}

	// Assign the test user; count updates.
	assignSection(t, app, clubID, "12345", &fluteID, true, http.StatusNoContent)
	res = doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/members")
	var members []struct {
		UserID        string `json:"user_id"`
		SectionID     string `json:"sectionId"`
		SectionName   string `json:"sectionName"`
		SectionLeader bool   `json:"sectionLeader"`
	}
	raw, _ = io.ReadAll(res.Body)
	_ = json.Unmarshal(raw, &members)
	if len(members) != 1 || members[0].SectionID != fluteID || !members[0].SectionLeader || members[0].SectionName != "Querflöten" {
		t.Fatalf("member section assignment not reflected: %+v", members)
	}

	// Unassign clears the leader flag too. (Fresh slice: omitempty drops the
	// sectionId key, and Unmarshal into a reused slice would keep old values.)
	assignSection(t, app, clubID, "12345", nil, true, http.StatusNoContent)
	res = doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/members")
	raw, _ = io.ReadAll(res.Body)
	members = nil
	_ = json.Unmarshal(raw, &members)
	if members[0].SectionID != "" || members[0].SectionLeader {
		t.Fatalf("expected unassigned member, got %+v", members)
	}

	// Unknown section id on assignment.
	unknown := "does-not-exist"
	assignSection(t, app, clubID, "12345", &unknown, false, http.StatusNotFound)

	// Non-managers: read allowed, mutations 403.
	demoteTestUserToMember(t, app, clubID, "sect-boss")
	if res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/sections"); res.StatusCode != http.StatusOK {
		t.Fatalf("member list sections: expected 200, got %d", res.StatusCode)
	}
	if res := postJSON(t, app, "http://localhost/api/v1/clubs/"+clubID+"/sections", map[string]string{"name": "Hörner"}); res.StatusCode != http.StatusForbidden {
		t.Fatalf("member create section: expected 403, got %d", res.StatusCode)
	}
	delReq, _ := http.NewRequest("DELETE", "http://localhost/api/v1/clubs/"+clubID+"/sections/"+fluteID, nil)
	if res, _ := app.Test(delReq); res.StatusCode != http.StatusForbidden {
		t.Fatalf("member delete section: expected 403, got %d", res.StatusCode)
	}
	assignSection(t, app, clubID, "sect-boss", &fluteID, false, http.StatusForbidden)
}

func TestSectionTargetedEventAudience(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	flutes := createSection(t, app, clubID, "Flöten")
	clarinets := createSection(t, app, clubID, "Klarinetten")
	seedClubMember(t, clubID, "flutist", "MITGLIED")
	assignSection(t, app, clubID, "flutist", &flutes, false, http.StatusNoContent)

	eventID := createSectionEvent(t, app, clubID, "Registerprobe", flutes)

	// Managers see section events regardless of their own section.
	events := listClubEvents(t, app, clubID)
	if len(events) != 1 {
		t.Fatalf("manager should see the section event, got %+v", events)
	}
	// Audience = flutist only (LEITER 12345 has no section): undecided 1.
	if events[0].UndecidedCount != 1 {
		t.Fatalf("expected audience-scoped undecided count 1, got %d", events[0].UndecidedCount)
	}

	// A member outside the section doesn't see it and cannot RSVP.
	demoteTestUserToMember(t, app, clubID, "event-boss")
	if events := listClubEvents(t, app, clubID); len(events) != 0 {
		t.Fatalf("outside member must not see the section event, got %+v", events)
	}
	respondBody := `{"status":"YES"}`
	req, _ := http.NewRequest("PUT", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID+"/response", bytes.NewBufferString(respondBody))
	req.Header.Set("Content-Type", "application/json")
	if res, _ := app.Test(req); res.StatusCode != http.StatusBadRequest {
		t.Fatalf("outside RSVP: expected 400, got %d", res.StatusCode)
	}

	// Cross-club list is filtered the same way.
	res := doRequest(t, app, "GET", "http://localhost/api/v1/club-events")
	var crossEvents []clubEvent
	raw, _ := io.ReadAll(res.Body)
	_ = json.Unmarshal(raw, &crossEvents)
	if len(crossEvents) != 0 {
		t.Fatalf("cross-club list must hide foreign-section events, got %+v", crossEvents)
	}

	// Joining the section makes it visible and RSVP-able. 12345 is now
	// MITGLIED, so the assignment must come from the current LEITER —
	// seed directly instead.
	if err := testQueries.UpdateClubMemberSection(context.Background(), db2.UpdateClubMemberSectionParams{
		SectionFk:     db2.NewSQLNullString(flutes),
		SectionLeader: false,
		ClubID:        clubID,
		UserID:        "12345",
	}); err != nil {
		t.Fatalf("seed section assignment: %v", err)
	}
	events = listClubEvents(t, app, clubID)
	if len(events) != 1 {
		t.Fatalf("section member should see the event, got %+v", events)
	}
	if events[0].UndecidedCount != 2 {
		t.Fatalf("audience now 2, expected undecided 2, got %d", events[0].UndecidedCount)
	}
	req, _ = http.NewRequest("PUT", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID+"/response", bytes.NewBufferString(respondBody))
	req.Header.Set("Content-Type", "application/json")
	if res, _ := app.Test(req); res.StatusCode != http.StatusNoContent {
		t.Fatalf("section member RSVP: expected 204, got %d", res.StatusCode)
	}

	// Wrong section blocks RSVP again.
	if err := testQueries.UpdateClubMemberSection(context.Background(), db2.UpdateClubMemberSectionParams{
		SectionFk:     db2.NewSQLNullString(clarinets),
		SectionLeader: false,
		ClubID:        clubID,
		UserID:        "12345",
	}); err != nil {
		t.Fatalf("seed section change: %v", err)
	}
	req, _ = http.NewRequest("PUT", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID+"/response", bytes.NewBufferString(respondBody))
	req.Header.Set("Content-Type", "application/json")
	if res, _ := app.Test(req); res.StatusCode != http.StatusBadRequest {
		t.Fatalf("wrong-section RSVP: expected 400, got %d", res.StatusCode)
	}
}

func TestSectionLeaderAttendanceVisibility(t *testing.T) {
	app := SetupTest(t)
	// Statuses under the "section" token; reasons manager-only.
	clubID := createClubWithVisibility(t, app, "section", "managers")
	flutes := createSection(t, app, clubID, "Flöten")
	seedClubMember(t, clubID, "flutist", "MITGLIED")
	seedClubMember(t, clubID, "clarinetist", "MITGLIED")
	assignSection(t, app, clubID, "flutist", &flutes, false, http.StatusNoContent)

	eventID := createEvent(t, app, clubID, "Gesamtprobe")
	ctx := context.Background()
	for _, seeded := range []struct{ user, status string }{
		{"flutist", "YES"}, {"clarinetist", "NO"},
	} {
		if err := testQueries.UpsertClubEventResponse(ctx, db2.UpsertClubEventResponseParams{
			EventID: eventID, UserID: seeded.user, Status: seeded.status, Reason: db2.NewSQLNullString("grund"),
		}); err != nil {
			t.Fatalf("seed response: %v", err)
		}
	}

	// Manager sees all three rows.
	att := getAttendance(t, app, clubID, eventID)
	if len(att.Rows) != 3 {
		t.Fatalf("manager expected 3 rows, got %+v", att.Rows)
	}

	// Plain member (no leader flag): own row only.
	demoteTestUserToMember(t, app, clubID, "att-boss")
	if err := testQueries.UpdateClubMemberSection(ctx, db2.UpdateClubMemberSectionParams{
		SectionFk: db2.NewSQLNullString(flutes), SectionLeader: false, ClubID: clubID, UserID: "12345",
	}); err != nil {
		t.Fatalf("seed member section: %v", err)
	}
	att = getAttendance(t, app, clubID, eventID)
	if len(att.Rows) != 1 || att.Rows[0].UserID != "12345" {
		t.Fatalf("plain section member expected own row only, got %+v", att.Rows)
	}

	// Registerführer of the flutes: own row + flutist, but not the clarinetist.
	if err := testQueries.UpdateClubMemberSection(ctx, db2.UpdateClubMemberSectionParams{
		SectionFk: db2.NewSQLNullString(flutes), SectionLeader: true, ClubID: clubID, UserID: "12345",
	}); err != nil {
		t.Fatalf("seed leader flag: %v", err)
	}
	att = getAttendance(t, app, clubID, eventID)
	if len(att.Rows) != 2 {
		t.Fatalf("section leader expected 2 rows, got %+v", att.Rows)
	}
	seen := map[string]string{}
	for _, row := range att.Rows {
		seen[row.UserID] = row.Reason
	}
	if _, ok := seen["flutist"]; !ok {
		t.Fatalf("leader must see own section's member, got %+v", att.Rows)
	}
	if _, ok := seen["clarinetist"]; ok {
		t.Fatalf("leader must not see other sections, got %+v", att.Rows)
	}
	// Reasons stay manager-only.
	if seen["flutist"] != "" {
		t.Fatalf("reason must stay hidden from section leader, got %+v", att.Rows)
	}
	// Aggregate counts remain club-wide for untargeted events.
	if att.YesCount != 1 || att.NoCount != 1 {
		t.Fatalf("expected club-wide counts yes=1 no=1, got %+v", att)
	}
}

func TestSectionDeleteFallsBackToWholeClub(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	flutes := createSection(t, app, clubID, "Flöten")
	seedClubMember(t, clubID, "flutist", "MITGLIED")
	assignSection(t, app, clubID, "flutist", &flutes, true, http.StatusNoContent)
	eventID := createSectionEvent(t, app, clubID, "Registerprobe", flutes)

	delReq, _ := http.NewRequest("DELETE", "http://localhost/api/v1/clubs/"+clubID+"/sections/"+flutes, nil)
	if res, _ := app.Test(delReq); res.StatusCode != http.StatusNoContent {
		t.Fatalf("delete section: expected 204, got %d", res.StatusCode)
	}

	// The event survives as a whole-club event...
	res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID)
	if res.StatusCode != http.StatusOK {
		t.Fatalf("event after section delete: expected 200, got %d", res.StatusCode)
	}
	var ev struct {
		SectionID string `json:"sectionId"`
	}
	raw, _ := io.ReadAll(res.Body)
	_ = json.Unmarshal(raw, &ev)
	if ev.SectionID != "" {
		t.Fatalf("expected whole-club event after section delete, got %+v", ev)
	}

	// ...and the member is simply unassigned.
	membersRes := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/members")
	var members []struct {
		UserID    string `json:"user_id"`
		SectionID string `json:"sectionId"`
	}
	raw, _ = io.ReadAll(membersRes.Body)
	_ = json.Unmarshal(raw, &members)
	for _, m := range members {
		if m.SectionID != "" {
			t.Fatalf("expected members unassigned after section delete, got %+v", members)
		}
	}
}
