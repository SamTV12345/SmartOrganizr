package service

import (
	"api_go/db"
	"api_go/mappers"
	"api_go/models"
	"context"
)

type ClubService struct {
	queries *db.Queries
	context context.Context
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
