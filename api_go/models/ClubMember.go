package models

type ClubMember struct {
	User
	Role ClubRole
	// Authorized ("Berechtigt") is a manager-granted flag independent of the
	// role; it backs the leaders-and-authorized / only-authorized
	// attendance-visibility settings.
	Authorized bool
}
