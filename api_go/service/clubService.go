package service

import (
	"api_go/controllers/dto"
	"api_go/db"
	"api_go/mappers"
	"api_go/models"
	"context"
	"database/sql"
	"github.com/google/uuid"
	"strings"
)

type ClubService struct {
	queries        *db.Queries
	addressService AddressService
	context        context.Context
}

func NewClubService(queries *db.Queries, addressService AddressService) ClubService {
	return ClubService{
		queries:        queries,
		context:        context.Background(),
		addressService: addressService,
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
		ID:                        clubId.String(),
		Name:                      club.Name,
		AddressID:                 addressId.String(),
		ClubType:                  club.ClubType,
		DatesVisibleForAllMembers: club.DatesVisibleForAllMember,
		MembersCanSendMessages:    club.MembersCanSendMessages,
		FeedbackVisibility:        club.FeedbackVisibility,
		ReasonVisibility:          club.ReasonVisibility,
		ConfirmedRepresentative:   club.ConfirmedRepresentative,
	}
	if err := c.queries.SaveClub(c.context, clubToSave); err != nil {
		return nil, err
	}

	savedClub := models.Club{
		Name:                     clubToSave.Name,
		ID:                       clubToSave.ID,
		ClubType:                 clubToSave.ClubType,
		DatesVisibleForAllMember: clubToSave.DatesVisibleForAllMembers,
		MembersCanSendMessages:   clubToSave.MembersCanSendMessages,
		FeedbackVisibility:       clubToSave.FeedbackVisibility,
		ReasonVisibility:         clubToSave.ReasonVisibility,
		ConfirmedRepresentative:  clubToSave.ConfirmedRepresentative,
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

func (c *ClubService) InviteUsersByEmail(clubId string, emails []string) ([]string, []string, error) {
	addedEmails := make([]string, 0)
	invitedEmails := make([]string, 0)

	for _, email := range emails {
		normalizedEmail := strings.TrimSpace(strings.ToLower(email))
		if normalizedEmail == "" {
			continue
		}

		user, err := c.queries.FindUserByEmail(c.context, db.NewSQLNullString(normalizedEmail))
		if err != nil {
			if err == sql.ErrNoRows {
				invitedEmails = append(invitedEmails, normalizedEmail)
				continue
			}
			return nil, nil, err
		}

		err = c.AddUserToClub(clubId, user.ID, models.Member)
		if err != nil {
			return nil, nil, err
		}
		addedEmails = append(addedEmails, normalizedEmail)
	}

	return addedEmails, invitedEmails, nil
}
