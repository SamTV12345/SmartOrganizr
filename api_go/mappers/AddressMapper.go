package mappers

import (
	"api_go/db"
	"api_go/models"
)

func ConvertAddress(address db.Address) models.Address {
	return models.Address{
		Location:    address.Location,
		Country:     address.Country,
		HouseNumber: address.HouseNumber,
		Id:          address.ID,
		PostalCode:  address.PostalCode,
		Street:      address.Street,
	}
}
