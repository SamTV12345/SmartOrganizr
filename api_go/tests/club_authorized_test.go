package tests

import (
	db2 "api_go/db"
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"github.com/gofiber/fiber/v3"
)

func patchAuthorized(t *testing.T, app *fiber.App, clubID, userID string, authorized bool, wantStatus int) {
	t.Helper()
	body := `{"authorized":true}`
	if !authorized {
		body = `{"authorized":false}`
	}
	req, _ := http.NewRequest("PATCH", "http://localhost/api/v1/clubs/"+clubID+"/members/"+userID+"/authorized", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("patch authorized: %v", err)
	}
	if res.StatusCode != wantStatus {
		raw, _ := io.ReadAll(res.Body)
		t.Fatalf("patch authorized: expected %d, got %d: %s", wantStatus, res.StatusCode, string(raw))
	}
}

// The only-authorized visibility is strictly the manager-granted flag: even a
// LEITER without it sees only their own attendance row. Granting the flag
// opens the matrix, and it keeps working after the user is demoted to MITGLIED.
func TestOnlyAuthorizedVisibilityFollowsFlag(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubWithVisibility(t, app, "only-authorized", "only-authorized")
	eventID := createEvent(t, app, clubID, "Strict")

	body := `{"status":"YES","reason":"dabei"}`
	req, _ := http.NewRequest("PUT", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID+"/response", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	if res, _ := app.Test(req); res.StatusCode != http.StatusNoContent {
		t.Fatalf("respond expected 204, got %d", res.StatusCode)
	}
	seedClubMember(t, clubID, "auth-peer", "MITGLIED")
	if err := testQueries.UpsertClubEventResponse(context.Background(), db2.UpsertClubEventResponseParams{
		EventID: eventID, UserID: "auth-peer", Status: "NO", Reason: db2.NewSQLNullString("krank"),
	}); err != nil {
		t.Fatalf("seed foreign response: %v", err)
	}

	// LEITER without the flag: strictly excluded from others' rows.
	att := getAttendance(t, app, clubID, eventID)
	if len(att.Rows) != 1 || att.Rows[0].UserID != "12345" {
		t.Fatalf("unauthorized LEITER must only see own row, got %+v", att.Rows)
	}

	// Grant the flag to self (still LEITER, so allowed) — full matrix opens.
	patchAuthorized(t, app, clubID, "12345", true, http.StatusNoContent)
	att = getAttendance(t, app, clubID, eventID)
	if len(att.Rows) != 2 {
		t.Fatalf("authorized caller must see all rows, got %+v", att.Rows)
	}
	for _, row := range att.Rows {
		if row.UserID == "auth-peer" && row.Reason != "krank" {
			t.Fatalf("authorized caller must see reasons under only-authorized, got %+v", row)
		}
	}

	// Authorized survives a role change: demote to MITGLIED, matrix stays open.
	patchRole(t, app, clubID, "auth-peer", "LEITER", http.StatusNoContent)
	patchRole(t, app, clubID, "12345", "MITGLIED", http.StatusNoContent)
	att = getAttendance(t, app, clubID, eventID)
	if len(att.Rows) != 2 {
		t.Fatalf("authorized MITGLIED must still see all rows, got %+v", att.Rows)
	}
}

func TestPatchAuthorizedRequiresManager(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	demoteTestUserToMember(t, app, clubID, "auth-boss")

	patchAuthorized(t, app, clubID, "auth-boss", true, http.StatusForbidden)
}

func TestMembersListExposesAuthorizedFlag(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	seedClubMember(t, clubID, "flag-user", "MITGLIED")

	patchAuthorized(t, app, clubID, "flag-user", true, http.StatusNoContent)

	res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/members")
	if res.StatusCode != http.StatusOK {
		t.Fatalf("members expected 200, got %d", res.StatusCode)
	}
	var members []struct {
		UserID     string `json:"user_id"`
		Authorized bool   `json:"authorized"`
	}
	raw, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(raw, &members); err != nil {
		t.Fatalf("decode members: %v", err)
	}
	got := map[string]bool{}
	for _, m := range members {
		got[m.UserID] = m.Authorized
	}
	if !got["flag-user"] || got["12345"] {
		t.Fatalf("expected flag-user authorized and 12345 not, got %+v", got)
	}
}
