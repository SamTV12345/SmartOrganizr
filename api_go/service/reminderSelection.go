package service

import "time"

// ReminderMode distinguishes the automatic job from a manager pressing "remind now".
type ReminderMode int

const (
	// ReminderAuto reminds each member at most once per event.
	ReminderAuto ReminderMode = iota
	// ReminderManual may repeat, but not within ManualReminderCooldown.
	ReminderManual
)

// ManualReminderCooldown keeps a manager from spamming the same member.
const ManualReminderCooldown = 12 * time.Hour

// ReminderCandidate is a member who has not answered yet.
type ReminderCandidate struct {
	UserID     string
	RemindedAt *time.Time
}

// SelectReminderRecipients filters open members by reminder history.
func SelectReminderRecipients(candidates []ReminderCandidate, mode ReminderMode, now time.Time) []string {
	out := make([]string, 0, len(candidates))
	for _, c := range candidates {
		switch {
		case c.RemindedAt == nil:
			out = append(out, c.UserID)
		case mode == ReminderManual && now.Sub(*c.RemindedAt) >= ManualReminderCooldown:
			out = append(out, c.UserID)
		}
	}
	return out
}

// ValidReminderHours bounds the club setting: 1 hour up to two weeks.
func ValidReminderHours(h int) bool { return h >= 1 && h <= 14*24 }
