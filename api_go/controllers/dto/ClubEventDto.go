package dto

// ClubEventRepeatDto describes an optional recurrence for event creation.
// Occurrences are materialized as independent events sharing one series id.
type ClubEventRepeatDto struct {
	Frequency string `json:"frequency" validate:"required"` // WEEKLY | BIWEEKLY | MONTHLY
	Until     string `json:"until" validate:"required"`     // RFC3339, inclusive upper bound
}

// ClubEventUpsertDto is the create/edit payload.
type ClubEventUpsertDto struct {
	Summary     string              `json:"summary" validate:"required"`
	Description *string             `json:"description"`
	Location    *string             `json:"location"`
	GeoDateX    *float64            `json:"geoDateX"`
	GeoDateY    *float64            `json:"geoDateY"`
	EventType   string              `json:"eventType"`                     // REHEARSAL | CONCERT | OTHER
	StartDate   string              `json:"startDate" validate:"required"` // RFC3339
	EndDate     *string             `json:"endDate"`                       // RFC3339 or null
	SectionID   *string             `json:"sectionId"`                     // null/empty = whole club
	Repeat      *ClubEventRepeatDto `json:"repeat"`                        // null = single event; only honoured on create
}

// ClubEventDto is a single event as returned to a member, including their own
// response and aggregate counts.
type ClubEventDto struct {
	ID             string   `json:"id"`
	ClubID         string   `json:"clubId"`
	ClubName       string   `json:"clubName,omitempty"`
	Summary        string   `json:"summary"`
	Description    string   `json:"description"`
	Location       string   `json:"location"`
	GeoDateX       *float64 `json:"geoDateX"`
	GeoDateY       *float64 `json:"geoDateY"`
	EventType      string   `json:"eventType"`
	StartDate      string   `json:"startDate"`
	EndDate        string   `json:"endDate"`
	Cancelled      bool     `json:"cancelled"`
	SeriesID       string   `json:"seriesId,omitempty"`
	SectionID      string   `json:"sectionId,omitempty"`
	SectionName    string   `json:"sectionName,omitempty"`
	MyStatus       string   `json:"myStatus"` // YES|NO|MAYBE|"" (=undecided)
	MyReason       string   `json:"myReason"`
	YesCount       int      `json:"yesCount"`
	NoCount        int      `json:"noCount"`
	MaybeCount     int      `json:"maybeCount"`
	UndecidedCount int      `json:"undecidedCount"`
}

// ClubEventResponseDto is a member's own RSVP submission.
type ClubEventResponseDto struct {
	Status string  `json:"status" validate:"required"` // YES|NO|MAYBE
	Reason *string `json:"reason"`
}

// AttendanceRowDto is one member's response in the attendance matrix.
type AttendanceRowDto struct {
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
	Status      string `json:"status"` // YES|NO|MAYBE|UNDECIDED
	Reason      string `json:"reason"`
}

// AttendanceDto is the full (visibility-filtered) matrix for one event.
type AttendanceDto struct {
	EventID        string             `json:"eventId"`
	YesCount       int                `json:"yesCount"`
	NoCount        int                `json:"noCount"`
	MaybeCount     int                `json:"maybeCount"`
	UndecidedCount int                `json:"undecidedCount"`
	Rows           []AttendanceRowDto `json:"rows"` // empty if caller may not see others
}
