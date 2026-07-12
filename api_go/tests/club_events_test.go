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
