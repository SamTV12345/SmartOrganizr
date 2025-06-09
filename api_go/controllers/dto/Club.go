package dto

type ClubDto struct {
	ID   string `json:"id"`
	Name string `json:"name"`

	// Address
	Id          string `json:"addressId"`
	Street      string `json:"street"`
	HouseNumber string `json:"house_number"`
	Location    string `json:"location"`
	PostalCode  string `json:"postal_code"`
	Country     string `json:"country"`
}
