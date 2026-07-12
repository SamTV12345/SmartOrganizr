package models

type ClubMember struct {
	User
	Role ClubRole
	// Authorized ("Berechtigt") is a manager-granted flag independent of the
	// role; it backs the leaders-and-authorized / only-authorized
	// attendance-visibility settings.
	Authorized bool
	// SectionID/SectionName: the instrument section (Register) the member
	// belongs to; empty = unassigned. SectionLeader marks the Registerführer
	// of that section (backs the "section" visibility token).
	SectionID     string
	SectionName   string
	SectionLeader bool
}
