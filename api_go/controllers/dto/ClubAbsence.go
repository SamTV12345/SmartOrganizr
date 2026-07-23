package dto

// ClubAbsenceUpsertDto is a member's own absence submission. Dates are plain
// calendar days (YYYY-MM-DD), matching the native <input type="date"> the UI uses.
type ClubAbsenceUpsertDto struct {
	StartDate string  `json:"startDate" validate:"required"`
	EndDate   string  `json:"endDate" validate:"required"`
	Reason    *string `json:"reason"`
}

// ClubAbsenceDto is a single absence range. DisplayName is only populated on the
// leaders' overview.
type ClubAbsenceDto struct {
	ID          string `json:"id"`
	ClubID      string `json:"clubId"`
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName,omitempty"`
	StartDate   string `json:"startDate"` // YYYY-MM-DD
	EndDate     string `json:"endDate"`   // YYYY-MM-DD
	Reason      string `json:"reason"`
	CreatedAt   string `json:"createdAt"`
}

// EventAvailabilityRowDto is one member's inferred availability for an event.
// Source is "rsvp" (explicit response wins), "absence" (inferred from an
// overlapping absence) or "assumed" (no signal — counted as expected).
type EventAvailabilityRowDto struct {
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
	Available   bool   `json:"available"`
	Source      string `json:"source"`
	Status      string `json:"status,omitempty"` // RSVP status when Source == "rsvp"
}

// EventAvailabilityDto is the "expected X / Y" view for one event.
type EventAvailabilityDto struct {
	EventID       string                    `json:"eventId"`
	ExpectedCount int                       `json:"expectedCount"`
	TotalCount    int                       `json:"totalCount"`
	Rows          []EventAvailabilityRowDto `json:"rows"`
}
