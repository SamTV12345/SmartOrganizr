package service

import (
	"api_go/db"
	"api_go/models"
	"context"
	"errors"
	"strings"
)

// ErrLastLeiter guards the invariant that every club keeps at least one LEITER.
var ErrLastLeiter = errors.New("club requires at least one LEITER; transfer the role first")

// ErrRemoveSelf: managers must use the leave endpoint for themselves.
var ErrRemoveSelf = errors.New("cannot remove yourself; leave the club instead")

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
		return ErrNoClubAccess
	}

	normalizedRole := strings.ToUpper(strings.TrimSpace(requestedRole))
	newRole := models.ClubRole(normalizedRole)
	if !isSupportedRole(newRole) {
		return errors.New("unsupported role")
	}

	if requesterRole != models.Admin && requesterRole != models.CoAdmin {
		return ErrManageForbidden
	}

	if requesterRole == models.CoAdmin && newRole == models.Admin {
		return errors.New("co-leiter cannot assign leiter role")
	}

	memberRole, err := c.GetRoleInClub(clubId, memberUserID)
	if err != nil {
		return err
	}

	if memberRole == models.Admin && newRole != models.Admin {
		if err := c.requireNotLastLeiter(clubId); err != nil {
			return err
		}
	}

	return c.queries.UpdateClubMemberRole(c.ctx, db.UpdateClubMemberRoleParams{
		Role:   db.ClubParticipantRole(newRole.String()),
		ClubID: clubId,
		UserID: memberUserID,
	})
}

// requireNotLastLeiter errors with ErrLastLeiter when the club has only one LEITER left.
func (c *ClubMemberService) requireNotLastLeiter(clubId string) error {
	adminCount, err := c.queries.CountClubMembersByRole(c.ctx, db.CountClubMembersByRoleParams{
		ClubID: clubId,
		Role:   db.ClubParticipantRole(models.Admin.String()),
	})
	if err != nil {
		return err
	}
	if adminCount <= 1 {
		return ErrLastLeiter
	}
	return nil
}

// RemoveMember lets a manager (LEITER/CO_LEITER) remove another member from the club.
func (c *ClubMemberService) RemoveMember(requesterID string, clubId string, memberUserID string) error {
	requesterRole, err := c.GetRoleInClub(clubId, requesterID)
	if err != nil {
		return ErrNoClubAccess
	}
	if requesterRole != models.Admin && requesterRole != models.CoAdmin {
		return ErrManageForbidden
	}
	if requesterID == memberUserID {
		return ErrRemoveSelf
	}

	memberRole, err := c.GetRoleInClub(clubId, memberUserID)
	if err != nil {
		return err // sql.ErrNoRows -> not a member of this club
	}
	if memberRole == models.Admin {
		if err := c.requireNotLastLeiter(clubId); err != nil {
			return err
		}
	}

	return c.queries.DeleteClubMember(c.ctx, db.DeleteClubMemberParams{
		ClubID: clubId,
		UserID: memberUserID,
	})
}

// LeaveClub removes the current user from the club; the last LEITER must transfer the role first.
func (c *ClubMemberService) LeaveClub(clubId string, userID string) error {
	role, err := c.GetRoleInClub(clubId, userID)
	if err != nil {
		return ErrNoClubAccess
	}
	if role == models.Admin {
		if err := c.requireNotLastLeiter(clubId); err != nil {
			return err
		}
	}

	return c.queries.DeleteClubMember(c.ctx, db.DeleteClubMemberParams{
		ClubID: clubId,
		UserID: userID,
	})
}

func isSupportedRole(role models.ClubRole) bool {
	return role == models.Admin ||
		role == models.CoAdmin ||
		role == models.Secretary ||
		role == models.Treasurer ||
		role == models.Member
}
