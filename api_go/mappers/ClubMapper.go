package mappers

import (
	"api_go/controllers/dto"
	"api_go/db"
	"api_go/models"
)

func ConvertClubFromEntityToModel(club db.GetClubsRow) models.Club {
	convertedAddress := ConvertAddress(club.Address)
	return models.Club{
		ID:                       club.Club.ID,
		Name:                     club.Club.Name,
		ClubType:                 club.Club.ClubType,
		Address:                  convertedAddress,
		DatesVisibleForAllMember: club.Club.DatesVisibleForAllMembers,
		MembersCanSendMessages:   club.Club.MembersCanSendMessages,
		FeedbackVisibility:       club.Club.FeedbackVisibility,
		ReasonVisibility:         club.Club.ReasonVisibility,
		ConfirmedRepresentative:  club.Club.ConfirmedRepresentative,
	}
}

func ConvertClubFromModelToDto(club models.Club) dto.ClubDto {
	return dto.ClubDto{
		ID: club.ID,
		BaseClubFields: dto.BaseClubFields{
			Name:                     club.Name,
			ClubType:                 club.ClubType,
			Location:                 club.Address.Location,
			Country:                  club.Address.Country,
			Street:                   club.Address.Street,
			PostalCode:               club.Address.PostalCode,
			HouseNumber:              club.Address.HouseNumber,
			DatesVisibleForAllMember: club.DatesVisibleForAllMember,
			MembersCanSendMessages:   club.MembersCanSendMessages,
			FeedbackVisibility:       club.FeedbackVisibility,
			ReasonVisibility:         club.ReasonVisibility,
			ConfirmedRepresentative:  club.ConfirmedRepresentative,
		},
	}
}
