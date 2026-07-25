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

type clubEvent struct {
	ID             string `json:"id"`
	Summary        string `json:"summary"`
	MyStatus       string `json:"myStatus"`
	Cancelled      bool   `json:"cancelled"`
	YesCount       int    `json:"yesCount"`
	UndecidedCount int    `json:"undecidedCount"`
}

type attendance struct {
	YesCount       int `json:"yesCount"`
	NoCount        int `json:"noCount"`
	UndecidedCount int `json:"undecidedCount"`
	Rows           []struct {
		UserID string `json:"userId"`
		Status string `json:"status"`
		Reason string `json:"reason"`
	} `json:"rows"`
}

func createEvent(t *testing.T, app *fiber.App, clubID, summary string) string {
	t.Helper()
	start := time.Now().Add(48 * time.Hour).Format(time.RFC3339)
	body := `{"summary":"` + summary + `","eventType":"REHEARSAL","startDate":"` + start + `"}`
	req, _ := http.NewRequest("POST", "http://localhost/api/v1/clubs/"+clubID+"/events", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("create event failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("expected 200 creating event, got %d: %s", res.StatusCode, string(raw))
	}
	var ev clubEvent
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &ev); err != nil {
		t.Fatalf("decode event: %v", err)
	}
	if ev.ID == "" {
		t.Fatalf("event id empty")
	}
	return ev.ID
}

func TestCreateAndListClubEvent(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	createEvent(t, app, clubID, "Rehearsal")

	req, _ := http.NewRequest("GET", "http://localhost/api/v1/clubs/"+clubID+"/events", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", res.StatusCode)
	}
	var events []clubEvent
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &events); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(events) != 1 || events[0].Summary != "Rehearsal" {
		t.Fatalf("unexpected events: %+v", events)
	}
	if events[0].UndecidedCount != 1 {
		t.Fatalf("expected undecided 1, got %d", events[0].UndecidedCount)
	}
}

func TestRespondUpsertCollapsesToOneRow(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	eventID := createEvent(t, app, clubID, "Concert")

	respond := func(status, reason string) {
		body := `{"status":"` + status + `","reason":"` + reason + `"}`
		req, _ := http.NewRequest("PUT", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID+"/response", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		res, err := app.Test(req)
		if err != nil {
			t.Fatalf("respond failed: %v", err)
		}
		if res.StatusCode != http.StatusNoContent {
			raw, _ := io.ReadAll(res.Body)
			t.Fatalf("expected 204, got %d: %s", res.StatusCode, string(raw))
		}
	}
	respond("MAYBE", "not sure")
	respond("YES", "")

	req, _ := http.NewRequest("GET", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID+"/attendance", nil)
	res, _ := app.Test(req)
	if res.StatusCode != http.StatusOK {
		t.Fatalf("attendance expected 200, got %d", res.StatusCode)
	}
	var att attendance
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &att); err != nil {
		t.Fatalf("decode attendance: %v", err)
	}
	if att.YesCount != 1 {
		t.Fatalf("expected yesCount 1 after overwrite, got %d", att.YesCount)
	}
	if len(att.Rows) != 1 || att.Rows[0].Status != "YES" {
		t.Fatalf("expected single YES row, got %+v", att.Rows)
	}
	if att.Rows[0].Reason != "" {
		t.Fatalf("expected reason cleared, got %q", att.Rows[0].Reason)
	}
}

func TestCrossClubMyEventsEndpoint(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	createEvent(t, app, clubID, "Across")

	req, _ := http.NewRequest("GET", "http://localhost/api/v1/club-events", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("my events failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", res.StatusCode)
	}
	var events []clubEvent
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &events); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(events) != 1 {
		t.Fatalf("expected 1 cross-club event, got %d", len(events))
	}
}

// createClubWithVisibility creates a club whose feedback/reason visibility tokens differ
// from createClubForTest's "all"/"all".
func createClubWithVisibility(t *testing.T, app *fiber.App, feedback, reason string) string {
	t.Helper()
	body := `{"name":"Vis Club","club_type":"musikverein","street":"Main","house_number":"1",` +
		`"location":"Town","postal_code":"12345","country":"DE","dates_visible_for_all_members":true,` +
		`"members_can_send_messages":true,"feedback_visibility":"` + feedback + `","reason_visibility":"` + reason + `",` +
		`"confirmed_representative":true}`
	req, _ := http.NewRequest("POST", "http://localhost/api/v1/clubs/", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("create club request failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("expected 200 creating club, got %d: %s", res.StatusCode, string(raw))
	}
	var club struct {
		ID string `json:"id"`
	}
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &club); err != nil {
		t.Fatalf("decode club: %v", err)
	}
	return club.ID
}

// demoteTestUserToMember hands the LEITER role to a seeded foreign user so the fixed
// test user "12345" continues as plain MITGLIED.
func demoteTestUserToMember(t *testing.T, app *fiber.App, clubID, newLeiterID string) {
	t.Helper()
	seedClubMember(t, clubID, newLeiterID, "MITGLIED")
	patchRole(t, app, clubID, newLeiterID, "LEITER", http.StatusNoContent)
	patchRole(t, app, clubID, "12345", "MITGLIED", http.StatusNoContent)
}

func getAttendance(t *testing.T, app *fiber.App, clubID, eventID string) attendance {
	t.Helper()
	res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID+"/attendance")
	if res.StatusCode != http.StatusOK {
		t.Fatalf("attendance expected 200, got %d", res.StatusCode)
	}
	var att attendance
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &att); err != nil {
		t.Fatalf("decode attendance: %v", err)
	}
	return att
}

func TestGetSingleClubEvent(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	eventID := createEvent(t, app, clubID, "Solo")

	res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID)
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", res.StatusCode)
	}
	var ev clubEvent
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &ev); err != nil {
		t.Fatalf("decode event: %v", err)
	}
	if ev.ID != eventID || ev.Summary != "Solo" || ev.Cancelled {
		t.Fatalf("unexpected event: %+v", ev)
	}

	// Cancelled events stay retrievable by id even though the cross-club list drops them.
	if res := doRequest(t, app, "POST", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID+"/cancel"); res.StatusCode != http.StatusNoContent {
		t.Fatalf("cancel expected 204, got %d", res.StatusCode)
	}
	res = doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID)
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for cancelled event, got %d", res.StatusCode)
	}
	raw, _ = io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &ev); err != nil {
		t.Fatalf("decode cancelled event: %v", err)
	}
	if !ev.Cancelled {
		t.Fatalf("expected cancelled=true, got %+v", ev)
	}

	if res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/events/does-not-exist"); res.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 for unknown event, got %d", res.StatusCode)
	}
}

func TestNonManagerEventMutationsGet403(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	eventID := createEvent(t, app, clubID, "Locked")
	demoteTestUserToMember(t, app, clubID, "event-boss")

	start := time.Now().Add(72 * time.Hour).Format(time.RFC3339)
	upsertBody := `{"summary":"Hijack","eventType":"REHEARSAL","startDate":"` + start + `"}`

	createReq, _ := http.NewRequest("POST", "http://localhost/api/v1/clubs/"+clubID+"/events", bytes.NewBufferString(upsertBody))
	createReq.Header.Set("Content-Type", "application/json")
	if res, _ := app.Test(createReq); res.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 creating event as MITGLIED, got %d", res.StatusCode)
	}

	updateReq, _ := http.NewRequest("PUT", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID, bytes.NewBufferString(upsertBody))
	updateReq.Header.Set("Content-Type", "application/json")
	if res, _ := app.Test(updateReq); res.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 updating event as MITGLIED, got %d", res.StatusCode)
	}

	if res := doRequest(t, app, "POST", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID+"/cancel"); res.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 cancelling event as MITGLIED, got %d", res.StatusCode)
	}
	if res := doRequest(t, app, "DELETE", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID); res.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 deleting event as MITGLIED, got %d", res.StatusCode)
	}

	// Reading stays allowed for plain members.
	if res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID); res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 reading event as MITGLIED, got %d", res.StatusCode)
	}
}

func TestAttendanceHidesReasonsFromMembers(t *testing.T) {
	app := SetupTest(t)
	// Statuses visible to everyone, reasons manager-only.
	clubID := createClubWithVisibility(t, app, "all-members", "leaders-and-authorized")
	eventID := createEvent(t, app, clubID, "Reasons")

	// Own response via API (as current LEITER "12345"), foreign response seeded directly.
	body := `{"status":"MAYBE","reason":"busy"}`
	req, _ := http.NewRequest("PUT", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID+"/response", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	if res, _ := app.Test(req); res.StatusCode != http.StatusNoContent {
		t.Fatalf("respond expected 204, got %d", res.StatusCode)
	}
	demoteTestUserToMember(t, app, clubID, "reason-boss")
	if err := testQueries.UpsertClubEventResponse(context.Background(), db2.UpsertClubEventResponseParams{
		EventID: eventID, UserID: "reason-boss", Status: "NO", Reason: db2.NewSQLNullString("familienfeier"),
	}); err != nil {
		t.Fatalf("seed foreign response: %v", err)
	}

	att := getAttendance(t, app, clubID, eventID)
	if len(att.Rows) != 2 {
		t.Fatalf("expected both member rows visible, got %+v", att.Rows)
	}
	for _, row := range att.Rows {
		switch row.UserID {
		case "12345":
			if row.Status != "MAYBE" || row.Reason != "busy" {
				t.Fatalf("own row must keep own reason: %+v", row)
			}
		case "reason-boss":
			if row.Status != "NO" {
				t.Fatalf("foreign status should stay visible: %+v", row)
			}
			if row.Reason != "" {
				t.Fatalf("foreign reason must be hidden from MITGLIED: %+v", row)
			}
		default:
			t.Fatalf("unexpected row: %+v", row)
		}
	}
}

func TestAttendanceSelfVisibilityShowsOnlyOwnRow(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubWithVisibility(t, app, "self", "self")
	eventID := createEvent(t, app, clubID, "Private")

	body := `{"status":"YES","reason":""}`
	req, _ := http.NewRequest("PUT", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID+"/response", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	if res, _ := app.Test(req); res.StatusCode != http.StatusNoContent {
		t.Fatalf("respond expected 204, got %d", res.StatusCode)
	}
	demoteTestUserToMember(t, app, clubID, "self-boss")
	if err := testQueries.UpsertClubEventResponse(context.Background(), db2.UpsertClubEventResponseParams{
		EventID: eventID, UserID: "self-boss", Status: "NO", Reason: db2.NewSQLNullString("geheim"),
	}); err != nil {
		t.Fatalf("seed foreign response: %v", err)
	}

	att := getAttendance(t, app, clubID, eventID)
	if len(att.Rows) != 1 || att.Rows[0].UserID != "12345" || att.Rows[0].Status != "YES" {
		t.Fatalf("MITGLIED must only see own row under self visibility, got %+v", att.Rows)
	}
	// Aggregate counts remain visible.
	if att.YesCount != 1 {
		t.Fatalf("expected yesCount 1, got %d", att.YesCount)
	}
}

func TestDeleteEventCascadesResponses(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	eventID := createEvent(t, app, clubID, "ToDelete")

	body := `{"status":"YES","reason":"da"}`
	req, _ := http.NewRequest("PUT", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID+"/response", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	if res, _ := app.Test(req); res.StatusCode != http.StatusNoContent {
		t.Fatalf("respond expected 204, got %d", res.StatusCode)
	}

	if res := doRequest(t, app, "DELETE", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID); res.StatusCode != http.StatusNoContent {
		t.Fatalf("delete expected 204, got %d", res.StatusCode)
	}

	ctx := context.Background()
	if _, err := testQueries.GetClubEventByID(ctx, db2.GetClubEventByIDParams{ID: eventID, ClubID: clubID}); err == nil {
		t.Fatalf("expected event to be gone after hard delete")
	}
	responses, err := testQueries.ListClubEventResponses(ctx, eventID)
	if err != nil {
		t.Fatalf("list responses: %v", err)
	}
	if len(responses) != 0 {
		t.Fatalf("expected responses to cascade away, got %d", len(responses))
	}
}

func TestCancelKeepsEventOutOfCrossClubList(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	eventID := createEvent(t, app, clubID, "ToCancel")

	req, _ := http.NewRequest("POST", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID+"/cancel", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("cancel failed: %v", err)
	}
	if res.StatusCode != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", res.StatusCode)
	}

	listReq, _ := http.NewRequest("GET", "http://localhost/api/v1/club-events", nil)
	listRes, _ := app.Test(listReq)
	var events []clubEvent
	raw, _ := io.ReadAll(listRes.Body)
	_ = json.Unmarshal(raw, &events)
	if len(events) != 0 {
		t.Fatalf("expected cancelled event excluded from cross-club list, got %d", len(events))
	}

	clubListReq, _ := http.NewRequest("GET", "http://localhost/api/v1/clubs/"+clubID+"/events", nil)
	clubListRes, _ := app.Test(clubListReq)
	var clubEvents []clubEvent
	raw2, _ := io.ReadAll(clubListRes.Body)
	_ = json.Unmarshal(raw2, &clubEvents)
	if len(clubEvents) != 1 {
		t.Fatalf("expected soft-cancelled event retained in per-club list, got %d", len(clubEvents))
	}
}

// --- Section leaders manage their own section's events, reinstate, series size ---
// (docs/superpowers/specs/2026-07-25-feature-completion-design.md)

// makeTestUserSectionLeader demotes the fixed test user to MITGLIED and makes it
// the Registerführer of the given section.
func makeTestUserSectionLeader(t *testing.T, app *fiber.App, clubID, sectionID string, leader bool) {
	t.Helper()
	demoteTestUserToMember(t, app, clubID, "section-boss-"+sectionID)
	if err := testQueries.UpdateClubMemberSection(context.Background(), db2.UpdateClubMemberSectionParams{
		SectionFk: db2.NewSQLNullString(sectionID), SectionLeader: leader, ClubID: clubID, UserID: "12345",
	}); err != nil {
		t.Fatalf("seed section leader: %v", err)
	}
}

func createEventExpecting(t *testing.T, app *fiber.App, clubID, summary, sectionID string, wantStatus int) string {
	t.Helper()
	start := time.Now().Add(72 * time.Hour).Format(time.RFC3339)
	body := map[string]any{"summary": summary, "eventType": "REHEARSAL", "startDate": start}
	if sectionID != "" {
		body["sectionId"] = sectionID
	}
	res := postJSON(t, app, "http://localhost/api/v1/clubs/"+clubID+"/events", body)
	if res.StatusCode != wantStatus {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("create event %q: expected %d, got %d: %s", summary, wantStatus, res.StatusCode, string(raw))
	}
	if wantStatus != http.StatusOK {
		return ""
	}
	var ev struct {
		ID string `json:"id"`
	}
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &ev); err != nil || ev.ID == "" {
		t.Fatalf("decode created event: %v (%s)", err, string(raw))
	}
	return ev.ID
}

func TestClubEventSectionLeaderManagesOwnSectionOnly(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	flutes := createSection(t, app, clubID, "Flöten")
	clarinets := createSection(t, app, clubID, "Klarinetten")

	// Prepared while still a manager: one event per section plus a club-wide one.
	ownEvent := createSectionEvent(t, app, clubID, "Registerprobe Flöten", flutes)
	foreignEvent := createSectionEvent(t, app, clubID, "Registerprobe Klarinetten", clarinets)
	wholeClubEvent := createEvent(t, app, clubID, "Gesamtprobe")

	makeTestUserSectionLeader(t, app, clubID, flutes, true)

	// Creating for the own section is allowed...
	createEventExpecting(t, app, clubID, "Zusatzprobe Flöten", flutes, http.StatusOK)
	// ...but not club-wide, and not for someone else's section.
	createEventExpecting(t, app, clubID, "Gesamtprobe Nr. 2", "", http.StatusForbidden)
	createEventExpecting(t, app, clubID, "Zusatzprobe Klarinetten", clarinets, http.StatusForbidden)

	start := time.Now().Add(96 * time.Hour).Format(time.RFC3339)
	update := func(eventID, sectionID string) int {
		body := map[string]any{"summary": "Geändert", "eventType": "REHEARSAL", "startDate": start}
		if sectionID != "" {
			body["sectionId"] = sectionID
		}
		res := sendJSON(t, app, "PUT", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID, body)
		return res.StatusCode
	}
	// Editing the own section's event stays allowed.
	if code := update(ownEvent, flutes); code != http.StatusOK {
		t.Fatalf("edit own section event: expected 200, got %d", code)
	}
	// Pushing it out of the own section is not: the target must stay mine.
	if code := update(ownEvent, clarinets); code != http.StatusForbidden {
		t.Fatalf("moving an event to a foreign section: expected 403, got %d", code)
	}
	if code := update(ownEvent, ""); code != http.StatusForbidden {
		t.Fatalf("turning a section event club-wide: expected 403, got %d", code)
	}
	// Nor is grabbing a club-wide event.
	if code := update(wholeClubEvent, flutes); code != http.StatusForbidden {
		t.Fatalf("grabbing a club-wide event: expected 403, got %d", code)
	}
	if code := update(foreignEvent, clarinets); code != http.StatusForbidden {
		t.Fatalf("editing a foreign section event: expected 403, got %d", code)
	}

	// Cancelling follows the same rule.
	if res := postJSON(t, app, "http://localhost/api/v1/clubs/"+clubID+"/events/"+ownEvent+"/cancel", map[string]string{}); res.StatusCode != http.StatusNoContent && res.StatusCode != http.StatusOK {
		t.Fatalf("cancel own section event: got %d", res.StatusCode)
	}
	if res := postJSON(t, app, "http://localhost/api/v1/clubs/"+clubID+"/events/"+wholeClubEvent+"/cancel", map[string]string{}); res.StatusCode != http.StatusForbidden {
		t.Fatalf("cancel club-wide event as section leader: expected 403, got %d", res.StatusCode)
	}

	// Deleting a whole series stays with the leadership.
	if res := doRequest(t, app, "DELETE", "http://localhost/api/v1/clubs/"+clubID+"/events/"+ownEvent+"/series"); res.StatusCode != http.StatusForbidden {
		t.Fatalf("series delete as section leader: expected 403, got %d", res.StatusCode)
	}
}

func TestClubEventPlainSectionMemberStillForbidden(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	flutes := createSection(t, app, clubID, "Flöten")
	ownEvent := createSectionEvent(t, app, clubID, "Registerprobe", flutes)

	// Same section, but without the leader flag.
	makeTestUserSectionLeader(t, app, clubID, flutes, false)

	createEventExpecting(t, app, clubID, "Zusatzprobe", flutes, http.StatusForbidden)
	res := sendJSON(t, app, "PUT", "http://localhost/api/v1/clubs/"+clubID+"/events/"+ownEvent, map[string]any{
		"summary": "Geändert", "eventType": "REHEARSAL",
		"startDate": time.Now().Add(96 * time.Hour).Format(time.RFC3339),
		"sectionId": flutes,
	})
	if res.StatusCode != http.StatusForbidden {
		t.Fatalf("plain section member edit: expected 403, got %d", res.StatusCode)
	}
}

func TestClubPermissionsExposeSectionEventAuthority(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	flutes := createSection(t, app, clubID, "Flöten")

	permissions := func() struct {
		CanManageEvents        bool   `json:"can_manage_events"`
		CanManageSectionEvents bool   `json:"can_manage_section_events"`
		MySectionID            string `json:"my_section_id"`
	} {
		t.Helper()
		res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/me/permissions")
		if res.StatusCode != http.StatusOK {
			t.Fatalf("permissions: expected 200, got %d", res.StatusCode)
		}
		var out struct {
			CanManageEvents        bool   `json:"can_manage_events"`
			CanManageSectionEvents bool   `json:"can_manage_section_events"`
			MySectionID            string `json:"my_section_id"`
		}
		raw, _ := io.ReadAll(res.Body)
		if err := json.Unmarshal(raw, &out); err != nil {
			t.Fatalf("decode permissions: %v (%s)", err, string(raw))
		}
		return out
	}

	// As LEITER: full event rights, no section authority needed.
	if got := permissions(); !got.CanManageEvents {
		t.Fatalf("leader must manage events, got %+v", got)
	}

	// As Registerführer: section authority with the own section id.
	makeTestUserSectionLeader(t, app, clubID, flutes, true)
	got := permissions()
	if got.CanManageEvents {
		t.Fatalf("section leader is no club-wide event manager, got %+v", got)
	}
	if !got.CanManageSectionEvents || got.MySectionID != flutes {
		t.Fatalf("section leader authority: %+v (section %s)", got, flutes)
	}

	// As plain member of that section: nothing.
	if err := testQueries.UpdateClubMemberSection(context.Background(), db2.UpdateClubMemberSectionParams{
		SectionFk: db2.NewSQLNullString(flutes), SectionLeader: false, ClubID: clubID, UserID: "12345",
	}); err != nil {
		t.Fatalf("clear leader flag: %v", err)
	}
	if got := permissions(); got.CanManageSectionEvents {
		t.Fatalf("plain member must have no section authority, got %+v", got)
	}
}

func TestClubEventReinstateUndoesTheCancellation(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	eventID := createEvent(t, app, clubID, "Abgesagte Probe")

	if res := postJSON(t, app, "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID+"/cancel", map[string]string{}); res.StatusCode >= 300 {
		t.Fatalf("cancel: got %d", res.StatusCode)
	}
	// A cancelled event rejects responses — the observable proof of its state.
	if res := sendJSON(t, app, "PUT", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID+"/response", map[string]string{"status": "YES"}); res.StatusCode < 400 {
		t.Fatalf("cancelled event must reject responses, got %d", res.StatusCode)
	}

	res := postJSON(t, app, "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID+"/reinstate", map[string]string{})
	if res.StatusCode >= 300 {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("reinstate: expected success, got %d: %s", res.StatusCode, string(raw))
	}

	found := false
	for _, ev := range listClubEvents(t, app, clubID) {
		if ev.ID == eventID {
			found = true
			if ev.Cancelled {
				t.Fatalf("reinstated event must not be cancelled: %+v", ev)
			}
		}
	}
	if !found {
		t.Fatalf("reinstated event must be back in the list")
	}
	// And it accepts responses again.
	if res := sendJSON(t, app, "PUT", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID+"/response", map[string]string{"status": "YES"}); res.StatusCode >= 300 {
		t.Fatalf("reinstated event must accept responses, got %d", res.StatusCode)
	}
}

func TestClubEventReinstateRequiresAuthority(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	flutes := createSection(t, app, clubID, "Flöten")
	sectionEvent := createSectionEvent(t, app, clubID, "Registerprobe", flutes)
	wholeClub := createEvent(t, app, clubID, "Gesamtprobe")
	for _, id := range []string{sectionEvent, wholeClub} {
		if res := postJSON(t, app, "http://localhost/api/v1/clubs/"+clubID+"/events/"+id+"/cancel", map[string]string{}); res.StatusCode >= 300 {
			t.Fatalf("cancel %s: got %d", id, res.StatusCode)
		}
	}

	makeTestUserSectionLeader(t, app, clubID, flutes, true)

	if res := postJSON(t, app, "http://localhost/api/v1/clubs/"+clubID+"/events/"+sectionEvent+"/reinstate", map[string]string{}); res.StatusCode >= 300 {
		t.Fatalf("section leader reinstating own section: got %d", res.StatusCode)
	}
	if res := postJSON(t, app, "http://localhost/api/v1/clubs/"+clubID+"/events/"+wholeClub+"/reinstate", map[string]string{}); res.StatusCode != http.StatusForbidden {
		t.Fatalf("section leader reinstating a club-wide event: expected 403, got %d", res.StatusCode)
	}
}

func TestClubEventSeriesCountIsReported(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	single := createEvent(t, app, clubID, "Einzeltermin")

	start := time.Now().Add(24 * time.Hour)
	res := postJSON(t, app, "http://localhost/api/v1/clubs/"+clubID+"/events", map[string]any{
		"summary": "Wochenprobe", "eventType": "REHEARSAL",
		"startDate": start.Format(time.RFC3339),
		"repeat": map[string]string{
			"frequency": "WEEKLY",
			"until":     start.Add(15 * 24 * time.Hour).Format(time.RFC3339),
		},
	})
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("create series: expected 200, got %d: %s", res.StatusCode, string(raw))
	}

	seriesEvents := 0
	for _, ev := range listClubEventsWithSeries(t, app, clubID) {
		if ev.ID == single {
			if ev.SeriesCount != 0 {
				t.Fatalf("single event must report no series count, got %+v", ev)
			}
			continue
		}
		if ev.SeriesID == "" {
			t.Fatalf("series occurrence without series id: %+v", ev)
		}
		seriesEvents++
	}
	if seriesEvents < 2 {
		t.Fatalf("expected several occurrences, got %d", seriesEvents)
	}
	for _, ev := range listClubEventsWithSeries(t, app, clubID) {
		if ev.SeriesID != "" && ev.SeriesCount != seriesEvents {
			t.Fatalf("every occurrence must report the series size %d, got %+v", seriesEvents, ev)
		}
	}
}

type clubEventWithSeries struct {
	ID          string `json:"id"`
	SeriesID    string `json:"seriesId"`
	SeriesCount int    `json:"seriesCount"`
}

func listClubEventsWithSeries(t *testing.T, app *fiber.App, clubID string) []clubEventWithSeries {
	t.Helper()
	res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/events")
	if res.StatusCode != http.StatusOK {
		t.Fatalf("list events: expected 200, got %d", res.StatusCode)
	}
	var events []clubEventWithSeries
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &events); err != nil {
		t.Fatalf("decode events: %v", err)
	}
	return events
}
