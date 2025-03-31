package mappers

import (
	"api_go/db"
	"api_go/models"
)

func ConvertUserFromEntity(entity db.User) models.User {
	return models.User{
		UserId:           entity.ID,
		Username:         entity.Username.String,
		SideBarCollapsed: entity.SideBarCollapsed,
		ProfilePic:       []byte(entity.ProfilePicture.String),
		Email:            entity.Email.String,
		Firstname:        entity.Firstname.String,
		Lastname:         entity.Lastname.String,
	}
}

func ConvertUserFromDto(dto models.User) models.User {
	return models.User{
		UserId:           dto.UserId,
		Username:         dto.Username,
		SideBarCollapsed: dto.SideBarCollapsed,
	}
}
