package dto

// MemberAttendanceDto is one member's attendance rate. Rates are 0..1 fractions
// (attended / eligible); the frontend renders them as percentages. Members with
// zero eligible events report a 0 rate.
type MemberAttendanceDto struct {
	UserID         string  `json:"userId"`
	DisplayName    string  `json:"displayName"`
	SectionID      string  `json:"sectionId,omitempty"`
	SectionName    string  `json:"sectionName,omitempty"`
	EligibleTotal  int     `json:"eligibleTotal"`
	AttendedTotal  int     `json:"attendedTotal"`
	RateTotal      float64 `json:"rateTotal"`
	EligibleWindow int     `json:"eligibleWindow"`
	AttendedWindow int     `json:"attendedWindow"`
	RateWindow     float64 `json:"rateWindow"`
}

// SectionAttendanceDto is the aggregate attendance for one section (or the
// "no section" bucket, with an empty SectionID).
type SectionAttendanceDto struct {
	SectionID      string  `json:"sectionId,omitempty"`
	SectionName    string  `json:"sectionName"`
	MemberCount    int     `json:"memberCount"`
	EligibleTotal  int     `json:"eligibleTotal"`
	AttendedTotal  int     `json:"attendedTotal"`
	RateTotal      float64 `json:"rateTotal"`
	EligibleWindow int     `json:"eligibleWindow"`
	AttendedWindow int     `json:"attendedWindow"`
	RateWindow     float64 `json:"rateWindow"`
}

// AttendanceStatsDto is the full per-club attendance report.
type AttendanceStatsDto struct {
	WindowDays int                    `json:"windowDays"`
	Members    []MemberAttendanceDto  `json:"members"`
	Sections   []SectionAttendanceDto `json:"sections"`
}
