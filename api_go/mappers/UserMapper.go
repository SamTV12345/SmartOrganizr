package mappers

import (
	"api_go/db"
	"api_go/models"
)

func ConvertUserFromEntity(entity db.User) models.User {
	return models.User{
		UserId:           entity.UserID,
		Username:         entity.Username.String,
		SelectedTheme:    entity.SelectedTheme.String,
		SideBarCollapsed: entity.SideBarCollapsed.(bool),
	}
}
