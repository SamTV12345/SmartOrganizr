package tests

import (
	"bytes"
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
	YesCount       int    `json:"yesCount"`
	UndecidedCount int    `json:"undecidedCount"`
}

type attendance struct {
	YesCount       int `json:"yesCount"`
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
