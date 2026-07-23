package tests

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"github.com/gofiber/fiber/v3"
)

type programEntry struct {
	ID              string  `json:"id"`
	NoteID          *string `json:"noteId"`
	Title           string  `json:"title"`
	Position        int     `json:"position"`
	DurationMinutes *int    `json:"durationMinutes"`
	NoteText        *string `json:"noteText"`
}

func putProgram(t *testing.T, app *fiber.App, clubID, eventID, body string) *http.Response {
	t.Helper()
	req, _ := http.NewRequest("PUT", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID+"/program", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("put program failed: %v", err)
	}
	return res
}

func getProgram(t *testing.T, app *fiber.App, clubID, eventID string) []programEntry {
	t.Helper()
	res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID+"/program")
	if res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("get program expected 200, got %d: %s", res.StatusCode, string(raw))
	}
	var entries []programEntry
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &entries); err != nil {
		t.Fatalf("decode program: %v", err)
	}
	return entries
}

func TestReplaceAndListEventProgram(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	noteIDs := createNotesForConcertTest(t, app, 1)
	eventID := createEvent(t, app, clubID, "Concert")

	body := `{"entries":[` +
		`{"noteId":"` + noteIDs[0] + `","title":"Overture","durationMinutes":5},` +
		`{"title":"Encore (not in library)","noteText":"maybe"}` +
		`]}`
	if res := putProgram(t, app, clubID, eventID, body); res.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("expected 200 replacing program, got %d: %s", res.StatusCode, string(raw))
	}

	entries := getProgram(t, app, clubID, eventID)
	if len(entries) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(entries))
	}
	if entries[0].Title != "Overture" || entries[0].Position != 0 {
		t.Fatalf("unexpected first entry: %+v", entries[0])
	}
	if entries[0].NoteID == nil || *entries[0].NoteID != noteIDs[0] {
		t.Fatalf("expected first entry linked to note %s, got %+v", noteIDs[0], entries[0])
	}
	if entries[0].DurationMinutes == nil || *entries[0].DurationMinutes != 5 {
		t.Fatalf("expected duration 5, got %+v", entries[0].DurationMinutes)
	}
	if entries[1].NoteID != nil {
		t.Fatalf("expected free-text entry to have null noteId, got %+v", entries[1])
	}
	if entries[1].Position != 1 {
		t.Fatalf("expected second entry position 1, got %d", entries[1].Position)
	}
}

func TestReorderAndRemoveEventProgram(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	eventID := createEvent(t, app, clubID, "Gala")

	putProgram(t, app, clubID, eventID, `{"entries":[{"title":"A"},{"title":"B"},{"title":"C"}]}`)

	// Reorder: C, A, B.
	putProgram(t, app, clubID, eventID, `{"entries":[{"title":"C"},{"title":"A"},{"title":"B"}]}`)
	entries := getProgram(t, app, clubID, eventID)
	got := []string{entries[0].Title, entries[1].Title, entries[2].Title}
	if got[0] != "C" || got[1] != "A" || got[2] != "B" {
		t.Fatalf("expected reordered [C A B], got %v", got)
	}

	// Remove down to a single piece.
	putProgram(t, app, clubID, eventID, `{"entries":[{"title":"A"}]}`)
	entries = getProgram(t, app, clubID, eventID)
	if len(entries) != 1 || entries[0].Title != "A" {
		t.Fatalf("expected single entry [A], got %+v", entries)
	}
}

func TestNonManagerCannotEditProgramButCanView(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	eventID := createEvent(t, app, clubID, "Locked")
	putProgram(t, app, clubID, eventID, `{"entries":[{"title":"A"}]}`)

	demoteTestUserToMember(t, app, clubID, "program-boss")

	if res := putProgram(t, app, clubID, eventID, `{"entries":[{"title":"Hijack"}]}`); res.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 editing program as MITGLIED, got %d", res.StatusCode)
	}
	// Reading stays allowed and unchanged.
	entries := getProgram(t, app, clubID, eventID)
	if len(entries) != 1 || entries[0].Title != "A" {
		t.Fatalf("member view should show unchanged program, got %+v", entries)
	}
}
