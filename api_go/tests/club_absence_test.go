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

type clubAbsence struct {
	ID          string `json:"id"`
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
	StartDate   string `json:"startDate"`
	EndDate     string `json:"endDate"`
	Reason      string `json:"reason"`
}

type eventAvailability struct {
	EventID       string `json:"eventId"`
	ExpectedCount int    `json:"expectedCount"`
	TotalCount    int    `json:"totalCount"`
	Rows          []struct {
		UserID    string `json:"userId"`
		Available bool   `json:"available"`
		Source    string `json:"source"`
		Status    string `json:"status"`
	} `json:"rows"`
}

func createAbsence(t *testing.T, app *fiber.App, clubID, start, end, reason string) string {
	t.Helper()
	body := `{"startDate":"` + start + `","endDate":"` + end + `","reason":"` + reason + `"}`
	req, _ := http.NewRequest("POST", "http://localhost/api/v1/clubs/"+clubID+"/absences", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("create absence failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("expected 200 creating absence, got %d: %s", res.StatusCode, string(raw))
	}
	var a clubAbsence
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &a); err != nil {
		t.Fatalf("decode absence: %v", err)
	}
	if a.ID == "" {
		t.Fatalf("absence id empty")
	}
	return a.ID
}

func getAvailability(t *testing.T, app *fiber.App, clubID, eventID string) eventAvailability {
	t.Helper()
	res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID+"/availability")
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("availability expected 200, got %d: %s", res.StatusCode, string(raw))
	}
	var av eventAvailability
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &av); err != nil {
		t.Fatalf("decode availability: %v", err)
	}
	return av
}

func TestCreateListDeleteAbsence(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)

	start := time.Now().Format("2006-01-02")
	end := time.Now().AddDate(0, 0, 5).Format("2006-01-02")
	id := createAbsence(t, app, clubID, start, end, "Urlaub")

	res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/absences")
	if res.StatusCode != http.StatusOK {
		t.Fatalf("list expected 200, got %d", res.StatusCode)
	}
	var list []clubAbsence
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &list); err != nil {
		t.Fatalf("decode list: %v", err)
	}
	if len(list) != 1 || list[0].Reason != "Urlaub" || list[0].StartDate != start {
		t.Fatalf("unexpected absence list: %+v", list)
	}

	if res := doRequest(t, app, "DELETE", "http://localhost/api/v1/clubs/"+clubID+"/absences/"+id); res.StatusCode != http.StatusNoContent {
		t.Fatalf("delete expected 204, got %d", res.StatusCode)
	}
	res = doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/absences")
	raw, _ = io.ReadAll(res.Body)
	_ = json.Unmarshal(raw, &list)
	if len(list) != 0 {
		t.Fatalf("expected empty after delete, got %+v", list)
	}

	// Deleting an unknown id is a 400 (not found) rather than a silent 204.
	if res := doRequest(t, app, "DELETE", "http://localhost/api/v1/clubs/"+clubID+"/absences/"+id); res.StatusCode == http.StatusNoContent {
		t.Fatalf("expected non-204 deleting missing absence, got %d", res.StatusCode)
	}
}

func TestAbsenceRejectsInvertedRange(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	start := time.Now().AddDate(0, 0, 5).Format("2006-01-02")
	end := time.Now().Format("2006-01-02")
	body := `{"startDate":"` + start + `","endDate":"` + end + `"}`
	req, _ := http.NewRequest("POST", "http://localhost/api/v1/clubs/"+clubID+"/absences", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	res, _ := app.Test(req)
	if res.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400 for inverted range, got %d", res.StatusCode)
	}
}

func TestAvailabilityInfersFromAbsenceAndRsvpWins(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	eventID := createEvent(t, app, clubID, "Probe") // starts +48h

	// Baseline: sole member assumed present.
	av := getAvailability(t, app, clubID, eventID)
	if av.TotalCount != 1 || av.ExpectedCount != 1 || av.Rows[0].Source != "assumed" {
		t.Fatalf("expected 1/1 assumed, got %+v", av)
	}

	// Absence covering the event date flips the member to unavailable.
	start := time.Now().Format("2006-01-02")
	end := time.Now().AddDate(0, 0, 10).Format("2006-01-02")
	createAbsence(t, app, clubID, start, end, "krank")
	av = getAvailability(t, app, clubID, eventID)
	if av.ExpectedCount != 0 || av.Rows[0].Source != "absence" || av.Rows[0].Available {
		t.Fatalf("expected 0 expected via absence, got %+v", av)
	}

	// An explicit YES RSVP overrides the inferred absence.
	body := `{"status":"YES"}`
	req, _ := http.NewRequest("PUT", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID+"/response", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	if res, _ := app.Test(req); res.StatusCode != http.StatusNoContent {
		t.Fatalf("rsvp expected 204, got %d", res.StatusCode)
	}
	av = getAvailability(t, app, clubID, eventID)
	if av.ExpectedCount != 1 || av.Rows[0].Source != "rsvp" || !av.Rows[0].Available {
		t.Fatalf("expected RSVP to win (1 expected), got %+v", av)
	}
}

func TestAbsenceOverviewManagerOnly(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)

	// As LEITER the overview is reachable.
	if res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/absences/overview"); res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 overview as LEITER, got %d", res.StatusCode)
	}

	// Demoted to MITGLIED the overview is forbidden, but own list still works.
	demoteTestUserToMember(t, app, clubID, "absence-boss")
	if res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/absences/overview"); res.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 overview as MITGLIED, got %d", res.StatusCode)
	}
	if res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/absences"); res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 own list as MITGLIED, got %d", res.StatusCode)
	}
}
