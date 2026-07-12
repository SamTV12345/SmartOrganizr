package tests

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v3"
)

type seriesEvent struct {
	ID        string `json:"id"`
	Summary   string `json:"summary"`
	StartDate string `json:"startDate"`
	EndDate   string `json:"endDate"`
	SeriesID  string `json:"seriesId"`
}

// seriesBase returns a stable future start (10:00 UTC on the 15th of a coming
// month) so monthly recurrence never hits end-of-month normalization.
func seriesBase() time.Time {
	now := time.Now().UTC()
	base := time.Date(now.Year(), now.Month(), 15, 10, 0, 0, 0, time.UTC).AddDate(0, 1, 0)
	return base
}

// postEvent posts a raw create-event body and returns the response.
func postEvent(t *testing.T, app *fiber.App, clubID, body string) *http.Response {
	t.Helper()
	req, _ := http.NewRequest("POST", "http://localhost/api/v1/clubs/"+clubID+"/events", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("create event request failed: %v", err)
	}
	return res
}

func createSeries(t *testing.T, app *fiber.App, clubID, summary, frequency string, start, until time.Time) seriesEvent {
	t.Helper()
	body := `{"summary":"` + summary + `","eventType":"REHEARSAL","startDate":"` + start.Format(time.RFC3339) +
		`","repeat":{"frequency":"` + frequency + `","until":"` + until.Format(time.RFC3339) + `"}}`
	res := postEvent(t, app, clubID, body)
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("expected 200 creating series, got %d: %s", res.StatusCode, string(raw))
	}
	var ev seriesEvent
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &ev); err != nil {
		t.Fatalf("decode series event: %v", err)
	}
	if ev.SeriesID == "" {
		t.Fatalf("expected seriesId on created series event, got %+v", ev)
	}
	return ev
}

func listEvents(t *testing.T, app *fiber.App, clubID string) []seriesEvent {
	t.Helper()
	res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/events")
	if res.StatusCode != http.StatusOK {
		t.Fatalf("list events expected 200, got %d", res.StatusCode)
	}
	var events []seriesEvent
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &events); err != nil {
		t.Fatalf("decode events: %v", err)
	}
	return events
}

func TestSeriesCreateWeeklyMaterializesOccurrences(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	start := seriesBase()
	// until lands between the 4th and a would-be 5th occurrence -> 4 rows.
	until := start.AddDate(0, 0, 3*7+2)
	first := createSeries(t, app, clubID, "Weekly Probe", "WEEKLY", start, until)

	events := listEvents(t, app, clubID)
	if len(events) != 4 {
		t.Fatalf("expected 4 weekly occurrences, got %d: %+v", len(events), events)
	}
	for i, ev := range events {
		if ev.SeriesID != first.SeriesID {
			t.Fatalf("occurrence %d has seriesId %q, want %q", i, ev.SeriesID, first.SeriesID)
		}
		got, err := time.Parse(time.RFC3339, ev.StartDate)
		if err != nil {
			t.Fatalf("parse startDate %q: %v", ev.StartDate, err)
		}
		want := start.AddDate(0, 0, 7*i)
		if !got.Equal(want) {
			t.Fatalf("occurrence %d starts at %s, want %s", i, got, want)
		}
	}
}

func TestSeriesCreateMonthlyUsesCalendarMonths(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	start := seriesBase()
	end := start.Add(90 * time.Minute)
	until := start.AddDate(0, 2, 1) // inclusive of the 3rd occurrence
	body := `{"summary":"Monthly Meeting","eventType":"OTHER","startDate":"` + start.Format(time.RFC3339) +
		`","endDate":"` + end.Format(time.RFC3339) +
		`","repeat":{"frequency":"MONTHLY","until":"` + until.Format(time.RFC3339) + `"}}`
	res := postEvent(t, app, clubID, body)
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("expected 200 creating monthly series, got %d: %s", res.StatusCode, string(raw))
	}

	events := listEvents(t, app, clubID)
	if len(events) != 3 {
		t.Fatalf("expected 3 monthly occurrences, got %d: %+v", len(events), events)
	}
	for i, ev := range events {
		gotStart, err := time.Parse(time.RFC3339, ev.StartDate)
		if err != nil {
			t.Fatalf("parse startDate %q: %v", ev.StartDate, err)
		}
		wantStart := start.AddDate(0, i, 0)
		if !gotStart.Equal(wantStart) {
			t.Fatalf("occurrence %d starts at %s, want %s", i, gotStart, wantStart)
		}
		gotEnd, err := time.Parse(time.RFC3339, ev.EndDate)
		if err != nil {
			t.Fatalf("parse endDate %q: %v", ev.EndDate, err)
		}
		if !gotEnd.Equal(wantStart.Add(90 * time.Minute)) {
			t.Fatalf("occurrence %d ends at %s, want %s", i, gotEnd, wantStart.Add(90*time.Minute))
		}
	}
}

func TestSeriesCreateEnforcesOccurrenceCap(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	start := seriesBase()
	until := start.AddDate(0, 0, 60*7) // 61 weekly occurrences > 52
	body := `{"summary":"Too Long","eventType":"REHEARSAL","startDate":"` + start.Format(time.RFC3339) +
		`","repeat":{"frequency":"WEEKLY","until":"` + until.Format(time.RFC3339) + `"}}`
	res := postEvent(t, app, clubID, body)
	if res.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400 for >52 occurrences, got %d", res.StatusCode)
	}
	raw, _ := io.ReadAll(res.Body)
	if !strings.Contains(string(raw), "52") {
		t.Fatalf("expected cap error message, got %s", string(raw))
	}
	if events := listEvents(t, app, clubID); len(events) != 0 {
		t.Fatalf("expected no events created on cap violation, got %d", len(events))
	}
}

func TestSeriesCreateValidatesRepeat(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	start := seriesBase()

	// until before start
	body := `{"summary":"Backwards","eventType":"REHEARSAL","startDate":"` + start.Format(time.RFC3339) +
		`","repeat":{"frequency":"WEEKLY","until":"` + start.AddDate(0, 0, -1).Format(time.RFC3339) + `"}}`
	if res := postEvent(t, app, clubID, body); res.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400 for until before start, got %d", res.StatusCode)
	}

	// invalid frequency
	body = `{"summary":"BadFreq","eventType":"REHEARSAL","startDate":"` + start.Format(time.RFC3339) +
		`","repeat":{"frequency":"DAILY","until":"` + start.AddDate(0, 0, 14).Format(time.RFC3339) + `"}}`
	if res := postEvent(t, app, clubID, body); res.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400 for invalid frequency, got %d", res.StatusCode)
	}

	// invalid until timestamp
	body = `{"summary":"BadUntil","eventType":"REHEARSAL","startDate":"` + start.Format(time.RFC3339) +
		`","repeat":{"frequency":"WEEKLY","until":"not-a-date"}}`
	if res := postEvent(t, app, clubID, body); res.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400 for invalid until, got %d", res.StatusCode)
	}

	if events := listEvents(t, app, clubID); len(events) != 0 {
		t.Fatalf("expected no events created by invalid payloads, got %d", len(events))
	}
}

func TestSeriesDeleteRemovesAllOccurrencesButNotOtherEvents(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	start := seriesBase()
	first := createSeries(t, app, clubID, "Serie", "BIWEEKLY", start, start.AddDate(0, 0, 4*14))
	soloID := createEvent(t, app, clubID, "Einzeltermin")

	if events := listEvents(t, app, clubID); len(events) != 6 {
		t.Fatalf("expected 5 series occurrences + 1 single event, got %d", len(events))
	}

	// Series delete on a non-series event is rejected.
	if res := doRequest(t, app, "DELETE", "http://localhost/api/v1/clubs/"+clubID+"/events/"+soloID+"/series"); res.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400 deleting series of a single event, got %d", res.StatusCode)
	}

	if res := doRequest(t, app, "DELETE", "http://localhost/api/v1/clubs/"+clubID+"/events/"+first.ID+"/series"); res.StatusCode != http.StatusNoContent {
		t.Fatalf("expected 204 deleting series, got %d", res.StatusCode)
	}

	events := listEvents(t, app, clubID)
	if len(events) != 1 || events[0].ID != soloID {
		t.Fatalf("expected only the single event to survive, got %+v", events)
	}
}

func TestSeriesSingleDeleteLeavesRestOfSeries(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	start := seriesBase()
	first := createSeries(t, app, clubID, "Teilserie", "WEEKLY", start, start.AddDate(0, 0, 2*7))

	if res := doRequest(t, app, "DELETE", "http://localhost/api/v1/clubs/"+clubID+"/events/"+first.ID); res.StatusCode != http.StatusNoContent {
		t.Fatalf("expected 204 deleting one occurrence, got %d", res.StatusCode)
	}

	events := listEvents(t, app, clubID)
	if len(events) != 2 {
		t.Fatalf("expected 2 remaining occurrences, got %d: %+v", len(events), events)
	}
	for _, ev := range events {
		if ev.ID == first.ID {
			t.Fatalf("deleted occurrence still present: %+v", ev)
		}
		if ev.SeriesID != first.SeriesID {
			t.Fatalf("remaining occurrence lost its seriesId: %+v", ev)
		}
	}
}

func TestSeriesNonManagerCannotDeleteSeries(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	start := seriesBase()
	first := createSeries(t, app, clubID, "Geschützt", "WEEKLY", start, start.AddDate(0, 0, 7))
	demoteTestUserToMember(t, app, clubID, "series-boss")

	if res := doRequest(t, app, "DELETE", "http://localhost/api/v1/clubs/"+clubID+"/events/"+first.ID+"/series"); res.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 deleting series as MITGLIED, got %d", res.StatusCode)
	}
	if events := listEvents(t, app, clubID); len(events) != 2 {
		t.Fatalf("expected series untouched, got %d events", len(events))
	}
}
