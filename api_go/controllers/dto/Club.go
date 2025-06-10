package dto

type BaseClubFields struct {
	Name        string `json:"name"`
	Street      string `json:"street"`
	HouseNumber string `json:"house_number"`
	Location    string `json:"location"`
	PostalCode  string `json:"postal_code"`
	Country     string `json:"country"`
}

type ClubDto struct {
	BaseClubFields
	ID string `json:"id"`
}
