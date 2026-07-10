package tests

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v3"
)

type calendarToken struct {
	Token string `json:"token"`
	URL   string `json:"url"`
}

func rotateCalendarToken(t *testing.T, app *fiber.App) calendarToken {
	t.Helper()
	req, _ := http.NewRequest("POST", "http://localhost/api/v1/users/calendar-token", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("rotate token failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("expected 200 rotating token, got %d: %s", res.StatusCode, string(raw))
	}
	var tok calendarToken
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &tok); err != nil {
		t.Fatalf("decode token: %v", err)
	}
	return tok
}

func fetchFeed(t *testing.T, app *fiber.App, token string) (*http.Response, string) {
	t.Helper()
	req, _ := http.NewRequest("GET", "http://localhost/public/calendar/"+token+".ics", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("feed request failed: %v", err)
	}
	raw, _ := io.ReadAll(res.Body)
	return res, string(raw)
}

func TestCalendarTokenRoundtripAndRotation(t *testing.T) {
	app := SetupTest(t)

	// No token configured yet.
	req, _ := http.NewRequest("GET", "http://localhost/api/v1/users/calendar-token", nil)
	res, _ := app.Test(req)
	if res.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 before generating a token, got %d", res.StatusCode)
	}

	first := rotateCalendarToken(t, app)
	if len(first.Token) != 64 {
		t.Fatalf("expected 64-char hex token, got %q", first.Token)
	}
	if !strings.HasPrefix(first.URL, "http://localhost:999/public/calendar/") || !strings.HasSuffix(first.URL, first.Token+".ics") {
		t.Fatalf("unexpected feed url: %q", first.URL)
	}

	// GET returns the same token.
	req, _ = http.NewRequest("GET", "http://localhost/api/v1/users/calendar-token", nil)
	res, _ = app.Test(req)
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 reading token, got %d", res.StatusCode)
	}
	var current calendarToken
	raw, _ := io.ReadAll(res.Body)
	_ = json.Unmarshal(raw, &current)
	if current.Token != first.Token {
		t.Fatalf("expected same token on GET, got %q vs %q", current.Token, first.Token)
	}

	// Rotating replaces the token and invalidates the old feed URL.
	second := rotateCalendarToken(t, app)
	if second.Token == first.Token {
		t.Fatalf("expected rotation to produce a new token")
	}
	oldRes, _ := fetchFeed(t, app, first.Token)
	if oldRes.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 for rotated-away token, got %d", oldRes.StatusCode)
	}
}

func TestCalendarFeedReturnsClubEvents(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	eventID := createEvent(t, app, clubID, "FeedRehearsal")
	tok := rotateCalendarToken(t, app)

	res, body := fetchFeed(t, app, tok.Token)
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 fetching feed, got %d: %s", res.StatusCode, body)
	}
	if ct := res.Header.Get("Content-Type"); !strings.Contains(ct, "text/calendar") {
		t.Fatalf("expected text/calendar content type, got %q", ct)
	}
	if !strings.Contains(body, "BEGIN:VCALENDAR") || !strings.Contains(body, "BEGIN:VEVENT") {
		t.Fatalf("expected VCALENDAR with VEVENT, got: %s", body)
	}
	if !strings.Contains(body, "FeedRehearsal") {
		t.Fatalf("expected event summary in feed, got: %s", body)
	}
	if !strings.Contains(body, "UID:"+eventID) {
		t.Fatalf("expected event id as UID in feed, got: %s", body)
	}
	if strings.Contains(body, "STATUS:CANCELLED") {
		t.Fatalf("did not expect cancelled status yet: %s", body)
	}

	// Cancelled events stay in the feed with STATUS:CANCELLED.
	cancelReq, _ := http.NewRequest("POST", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID+"/cancel", nil)
	cancelRes, _ := app.Test(cancelReq)
	if cancelRes.StatusCode != http.StatusNoContent {
		t.Fatalf("expected 204 cancelling event, got %d", cancelRes.StatusCode)
	}
	_, body = fetchFeed(t, app, tok.Token)
	if !strings.Contains(body, "STATUS:CANCELLED") {
		t.Fatalf("expected STATUS:CANCELLED for cancelled event, got: %s", body)
	}
}

func TestCalendarFeedWrongToken(t *testing.T) {
	app := SetupTest(t)
	res, _ := fetchFeed(t, app, "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef")
	if res.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 for unknown token, got %d", res.StatusCode)
	}
}
