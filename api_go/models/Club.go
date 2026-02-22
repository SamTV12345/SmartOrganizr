package models

type ClubRole string

// role ENUM('LEITER','CO_LEITER', 'SCHRIFTFUEHRER', 'SCHATZMEISTER', 'MITGLIED'),
const (
	Admin     ClubRole = "LEITER"
	CoAdmin   ClubRole = "CO_LEITER"
	Secretary ClubRole = "SCHRIFTFUEHRER"
	Treasurer ClubRole = "SCHATZMEISTER"
	Member    ClubRole = "MITGLIED"
)

func (c ClubRole) String() string {
	return string(c)
}

type Club struct {
	ID                       string
	Name                     string
	ClubType                 string
	Address                  Address
	DatesVisibleForAllMember bool
	MembersCanSendMessages   bool
	FeedbackVisibility       string
	ReasonVisibility         string
	ConfirmedRepresentative  bool
}
