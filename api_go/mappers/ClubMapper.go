package mappers

import (
	"api_go/controllers/dto"
	"api_go/db"
	"api_go/models"
)

func ConvertClubFromEntityToModel(club db.GetClubsRow) models.Club {
	convertedAddress := ConvertAddress(club.Address)
	return models.Club{
		ID:      club.Club.ID,
		Name:    club.Club.Name,
		Address: convertedAddress,
	}
}

func ConvertClubFromModelToDto(club models.Club) dto.ClubDto {
	return dto.ClubDto{
		ID:   club.ID,
		Name: club.Name,

		Street:      club.Street,
		PostalCode:  club.PostalCode,
		Id:          club.ID,
		HouseNumber: club.HouseNumber,
		Country:     club.Country,
		Location:    club.Location,
	}
}
