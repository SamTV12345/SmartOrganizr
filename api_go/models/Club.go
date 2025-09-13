package models

type ClubRole string

// role ENUM('LEITER','CO_LEITER', 'SCHATZMEISTER', 'MITGLIED'),
const (
	Admin     ClubRole = "LEITER"
	CoAdmin   ClubRole = "CO_LEITER"
	Treasurer ClubRole = "SCHATZMEISTER"
	Member    ClubRole = "MITGLIED"
)

func (c ClubRole) String() string {
	return string(c)
}

type Club struct {
	ID   string
	Name string
	Address
}
