package service

import (
	"api_go/db"
	"api_go/models"
	"context"
	"errors"
	"strings"
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
		memberRole := models.ClubRole(member.ClubParticipant.Role)
		memberModels = append(memberModels, models.ClubMember{
			User: models.User{
				UserId:    member.ClubParticipant.UserID,
				Username:  member.User.Username.String,
				Email:     member.User.Email.String,
				Firstname: member.User.Firstname.String,
				Lastname:  member.User.Lastname.String,
			},
			Role: memberRole,
		})
	}
	return &memberModels, nil
}

func (c *ClubMemberService) GetRoleInClub(clubId string, userId string) (models.ClubRole, error) {
	member, err := c.queries.FindClubMemberByClubAndUser(c.ctx, db.FindClubMemberByClubAndUserParams{
		ClubID: clubId,
		UserID: userId,
	})
	if err != nil {
		return "", err
	}
	return models.ClubRole(member.ClubParticipant.Role), nil
}

func (c *ClubMemberService) UpdateMemberRole(requesterID string, clubId string, memberUserID string, requestedRole string) error {
	requesterRole, err := c.GetRoleInClub(clubId, requesterID)
	if err != nil {
		return err
	}

	normalizedRole := strings.ToUpper(strings.TrimSpace(requestedRole))
	newRole := models.ClubRole(normalizedRole)
	if !isSupportedRole(newRole) {
		return errors.New("unsupported role")
	}

	if requesterRole != models.Admin && requesterRole != models.CoAdmin {
		return errors.New("insufficient role permissions")
	}

	if requesterRole == models.CoAdmin && newRole == models.Admin {
		return errors.New("co-leiter cannot assign leiter role")
	}

	memberRole, err := c.GetRoleInClub(clubId, memberUserID)
	if err != nil {
		return err
	}

	if memberRole == models.Admin && newRole != models.Admin {
		adminCount, countErr := c.queries.CountClubMembersByRole(c.ctx, db.CountClubMembersByRoleParams{
			ClubID: clubId,
			Role:   db.ClubParticipantRole(models.Admin.String()),
		})
		if countErr != nil {
			return countErr
		}
		if adminCount <= 1 {
			return errors.New("club requires at least one leiter")
		}
	}

	return c.queries.UpdateClubMemberRole(c.ctx, db.UpdateClubMemberRoleParams{
		Role:   db.ClubParticipantRole(newRole.String()),
		ClubID: clubId,
		UserID: memberUserID,
	})
}

func isSupportedRole(role models.ClubRole) bool {
	return role == models.Admin ||
		role == models.CoAdmin ||
		role == models.Secretary ||
		role == models.Treasurer ||
		role == models.Member
}
