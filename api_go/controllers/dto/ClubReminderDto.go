package dto

// ClubReminderSettingsDto: automatic reminders for open event responses.
// HoursBefore nil = off; otherwise members without an answer are reminded
// this many hours before the event starts.
type ClubReminderSettingsDto struct {
	HoursBefore *int `json:"hoursBefore"`
}

type ClubRemindResultDto struct {
	Sent int `json:"sent" validate:"required"`
}
