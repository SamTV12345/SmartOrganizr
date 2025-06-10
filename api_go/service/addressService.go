package service

import (
	"api_go/db"
	"api_go/models"
	"context"
)

type AddressService struct {
	Queries *db.Queries
	Ctx     context.Context
}

func (a *AddressService) SaveAddress(address *models.Address) (*models.Address, error) {
	if err := a.Queries.SaveAddress(a.Ctx, db.SaveAddressParams{
		Country:     address.Country,
		Location:    address.Location,
		ID:          address.Id,
		HouseNumber: address.HouseNumber,
		PostalCode:  address.PostalCode,
		Street:      address.Street,
	}); err != nil {
		return nil, err
	}
	return address, nil
}
