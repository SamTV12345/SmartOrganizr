package tests

import (
	"api_go/service"
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"sort"
	"sync"
	"testing"
	"time"

	db2 "api_go/db"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type fakeMailer struct {
	mu   sync.Mutex
	sent []string
}

func (f *fakeMailer) SendEventReminderEmail(to, _, _, _, _ string, _ time.Time, _ string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.sent = append(f.sent, to)
	return nil
}

func putReminderSettings(t *testing.T, app *fiber.App, clubID, body string) *http.Response {
	t.Helper()
	req, _ := http.NewRequest("PUT", "http://localhost/api/v1/clubs/"+clubID+"/reminder-settings", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("put reminder settings: %v", err)
	}
	return res
}

func remindNow(t *testing.T, app *fiber.App, clubID, eventID string) int {
	t.Helper()
	res := doRequest(t, app, "POST", "http://localhost/api/v1/clubs/"+clubID+"/events/"+eventID+"/remind")
	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode != http.StatusOK {
		t.Fatalf("remind: expected 200, got %d: %s", res.StatusCode, string(raw))
	}
	var out struct {
		Sent int `json:"sent"`
	}
	_ = json.Unmarshal(raw, &out)
	return out.Sent
}

func respond(t *testing.T, eventID, userID, status string) {
	t.Helper()
	if err := testQueries.UpsertClubEventResponse(context.Background(), db2.UpsertClubEventResponseParams{EventID: eventID, UserID: userID, Status: status}); err != nil {
		t.Fatalf("respond: %v", err)
	}
}

func absentAroundNow(t *testing.T, clubID, userID string) {
	t.Helper()
	today := time.Now().UTC().Truncate(24 * time.Hour)
	if err := testQueries.CreateClubAbsence(context.Background(), db2.CreateClubAbsenceParams{
		ID: uuid.NewString(), ClubID: clubID, UserID: userID, StartDate: today, EndDate: today.Add(5 * 24 * time.Hour),
	}); err != nil {
		t.Fatalf("absence: %v", err)
	}
}

func TestReminderSettings(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)

	res := doRequest(t, app, "GET", "http://localhost/api/v1/clubs/"+clubID+"/reminder-settings")
	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode != http.StatusOK || string(raw) != `{"hoursBefore":null}` {
		t.Fatalf("default must be off, got %d %s", res.StatusCode, string(raw))
	}
	res = putReminderSettings(t, app, clubID, `{"hoursBefore":48}`)
	raw, _ = io.ReadAll(res.Body)
	if res.StatusCode != http.StatusOK || string(raw) != `{"hoursBefore":48}` {
		t.Fatalf("enable: %d %s", res.StatusCode, string(raw))
	}
	if res := putReminderSettings(t, app, clubID, `{"hoursBefore":0}`); res.StatusCode != http.StatusBadRequest {
		t.Fatalf("0 hours: expected 400, got %d", res.StatusCode)
	}
	if res := putReminderSettings(t, app, clubID, `{"hoursBefore":null}`); res.StatusCode != http.StatusOK {
		t.Fatalf("disable: expected 200, got %d", res.StatusCode)
	}

	demoteTestUserToMember(t, app, clubID, "reminder-boss")
	if res := putReminderSettings(t, app, clubID, `{"hoursBefore":24}`); res.StatusCode != http.StatusForbidden {
		t.Fatalf("member: expected 403, got %d", res.StatusCode)
	}
}

func TestRemindNowSkipsAnsweredAndAbsentMembers(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	eventID := createEvent(t, app, clubID, "Generalprobe")
	seedClubMember(t, clubID, "rem-open", "MITGLIED")
	seedClubMember(t, clubID, "rem-yes", "MITGLIED")
	seedClubMember(t, clubID, "rem-absent", "MITGLIED")
	respond(t, eventID, "rem-yes", "YES")
	absentAroundNow(t, clubID, "rem-absent")

	// Open: the test user (leader, no answer) and rem-open.
	if n := remindNow(t, app, clubID, eventID); n != 2 {
		t.Fatalf("expected 2 reminders, got %d", n)
	}
	// Cooldown: pressing again right away reminds nobody.
	if n := remindNow(t, app, clubID, eventID); n != 0 {
		t.Fatalf("expected cooldown, got %d", n)
	}
}

func TestRemindNowRespectsSectionEvents(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	brass := createSection(t, app, clubID, "Blech")
	seedClubMember(t, clubID, "rem-brass", "MITGLIED")
	seedClubMember(t, clubID, "rem-wood", "MITGLIED")
	assignSection(t, app, clubID, "rem-brass", &brass, false, http.StatusNoContent)
	eventID := createSectionEvent(t, app, clubID, "Registerprobe Blech", brass)

	if n := remindNow(t, app, clubID, eventID); n != 1 {
		t.Fatalf("only the brass member should be reminded, got %d", n)
	}
}

func TestAutomaticRemindersOncePerMemberWithinWindow(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	eventID := createEvent(t, app, clubID, "Konzert") // starts in 48 h
	seedClubMember(t, clubID, "auto-a", "MITGLIED")
	seedClubMember(t, clubID, "auto-b", "MITGLIED")
	if _, err := testDB.Exec("UPDATE user SET email = CONCAT(id, '@example.org') WHERE id IN ('auto-a', 'auto-b')"); err != nil {
		t.Fatalf("set emails: %v", err)
	}
	respond(t, eventID, "auto-b", "NO")

	mailer := &fakeMailer{}
	reminders := service.NewReminderService(testQueries, service.NewClubMemberService(testQueries, service.NewClubService(testQueries, service.NewAddressService(testQueries))), mailer, nil, "http://localhost", nil)
	now := time.Now().UTC()

	// Off by default: nothing happens.
	if n, err := reminders.RunDue(now); err != nil || n != 0 {
		t.Fatalf("disabled: n=%d err=%v", n, err)
	}

	putReminderSettings(t, app, clubID, `{"hoursBefore":72}`)
	// 30 h earlier the event is 78 h away — outside the 72 h window.
	if n, _ := reminders.RunDue(now.Add(-30 * time.Hour)); n != 0 {
		t.Fatalf("outside window: expected 0, got %d", n)
	}
	n, err := reminders.RunDue(now)
	if err != nil {
		t.Fatalf("run: %v", err)
	}
	// auto-a and the test user are open; auto-b said no.
	if n != 2 {
		t.Fatalf("expected 2 reminders, got %d", n)
	}
	sort.Strings(mailer.sent)
	if len(mailer.sent) < 1 || mailer.sent[0] != "auto-a@example.org" {
		t.Fatalf("expected a mail to auto-a, got %v", mailer.sent)
	}
	// The job never reminds the same member twice for one event.
	if n, _ := reminders.RunDue(now.Add(time.Hour)); n != 0 {
		t.Fatalf("second run: expected 0, got %d", n)
	}
	_ = eventID
}
