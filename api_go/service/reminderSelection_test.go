package service

import (
	"reflect"
	"strings"
	"testing"
	"time"
)

func TestSelectReminderRecipients(t *testing.T) {
	now := time.Date(2026, 11, 5, 18, 0, 0, 0, time.UTC)
	recent := now.Add(-2 * time.Hour)
	old := now.Add(-13 * time.Hour)
	candidates := []ReminderCandidate{
		{UserID: "never"},
		{UserID: "recent", RemindedAt: &recent},
		{UserID: "old", RemindedAt: &old},
	}
	if got := SelectReminderRecipients(candidates, ReminderAuto, now); !reflect.DeepEqual(got, []string{"never"}) {
		t.Fatalf("auto: got %v", got)
	}
	if got := SelectReminderRecipients(candidates, ReminderManual, now); !reflect.DeepEqual(got, []string{"never", "old"}) {
		t.Fatalf("manual: got %v", got)
	}
	if got := SelectReminderRecipients(nil, ReminderManual, now); len(got) != 0 {
		t.Fatalf("empty: got %v", got)
	}
}

func TestValidReminderHours(t *testing.T) {
	for h, want := range map[int]bool{0: false, 1: true, 48: true, 336: true, 337: false, -5: false} {
		if ValidReminderHours(h) != want {
			t.Errorf("ValidReminderHours(%d) != %v", h, want)
		}
	}
}

func TestBuildEventReminderHTML(t *testing.T) {
	start := time.Date(2026, 11, 7, 18, 30, 0, 0, time.UTC) // 19:30 in Berlin (CET)
	out := BuildEventReminderHTML("Erika", "MV <Test>", "Probe & <b>Konzert</b>", "Halle", start, "https://example.org/ui/dashboard")
	for _, want := range []string{"Hallo Erika", "MV &lt;Test&gt;", "Probe &amp; &lt;b&gt;Konzert&lt;/b&gt;", "Samstag, 07.11.2026 um 19:30 Uhr", "Ort: Halle", "https://example.org/ui/dashboard"} {
		if !strings.Contains(out, want) {
			t.Errorf("mail misses %q", want)
		}
	}
	if strings.Contains(out, "<b>Konzert</b>") {
		t.Error("user content must be escaped")
	}
}
