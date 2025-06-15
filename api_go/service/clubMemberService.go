package service

import (
	"api_go/db"
	"api_go/models"
	"context"
)

type ClubMemberService struct {
	queries     *db.Queries
	ctx         context.Context
	clubService ClubService
}

func NewClubMemberService(queries *db.Queries, clubService ClubService) ClubMemberService {
	return ClubMemberService{
		queries:     queries,
		ctx:         context.Background(),
		clubService: clubService,
	}
}

func (c *ClubMemberService) GetAllMembersForClub(clubId string) (*[]models.ClubMember, error) {
	var members, err = c.queries.FindAllMembersOfClub(c.ctx, clubId)
	if err != nil {
		return nil, err
	}
	var memberModels = make([]models.ClubMember, 0)
	for _, member := range members {
		memberModels = append(memberModels, models.ClubMember{
			User: models.User{
				UserId: member.ClubParticipant.UserID,
			},
		})
	}
	return &memberModels, nil
}
