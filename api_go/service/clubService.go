package service

import (
	"api_go/controllers/dto"
	"api_go/db"
	"api_go/mappers"
	"api_go/models"
	"context"
	"github.com/google/uuid"
)

type ClubService struct {
	queries        *db.Queries
	addressService AddressService
	context        context.Context
}

func NewClubService(queries *db.Queries) ClubService {
	return ClubService{
		queries: queries,
		context: context.Background(),
	}
}

func (c *ClubService) GetAllClubsForMyId(userId *string) (*[]models.Club, error) {
	var clubModels = make([]models.Club, 0)
	result, err := c.queries.GetClubs(c.context, *userId)

	if err != nil {
		return nil, err
	}

	for _, club := range result {
		clubModels = append(clubModels, mappers.ConvertClubFromEntityToModel(club))
	}
	return &clubModels, nil
}

func (c *ClubService) AddUserToClub(clubId string, userId string, role models.ClubRole) error {
	return c.queries.CreateMemberInClub(c.context, db.CreateMemberInClubParams{
		ClubID: clubId,
		UserID: userId,
		Role:   db.ClubParticipantRole(role.String()),
	})
}

func (c *ClubService) CreateClub(club dto.ClubPostDto) (*models.Club, error) {
	addressId, err := uuid.NewRandom()
	if err != nil {
		return nil, err
	}

	clubId, err := uuid.NewRandom()
	if err != nil {
		return nil, err
	}

	savedAddress, err := c.addressService.SaveAddress(&models.Address{
		Street:      club.Street,
		PostalCode:  club.PostalCode,
		Id:          addressId.String(),
		HouseNumber: club.HouseNumber,
		Location:    club.Location,
		Country:     club.Country,
	})

	if err != nil {
		return nil, err
	}

	clubToSave := db.SaveClubParams{
		ID:        clubId.String(),
		Name:      club.Name,
		AddressID: addressId.String(),
	}
	if err := c.queries.SaveClub(c.context, clubToSave); err != nil {
		return nil, err
	}

	savedClub := models.Club{
		Name: clubToSave.Name,
		ID:   clubToSave.ID,
		Address: models.Address{
			Street:      savedAddress.Street,
			PostalCode:  savedAddress.PostalCode,
			Id:          savedAddress.Id,
			Country:     savedAddress.Country,
			Location:    savedAddress.Location,
			HouseNumber: savedAddress.HouseNumber,
		},
	}
	return &savedClub, nil
}
