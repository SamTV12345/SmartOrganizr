package mappers

import (
	"api_go/controllers/dto"
	"api_go/models"
)

func ConvertUserDtoFromModel(user models.User) dto.User {
	return dto.User{
		UserId:           user.UserId,
		Username:         user.Username,
		SelectedTheme:    user.SelectedTheme,
		SideBarCollapsed: user.SideBarCollapsed,
	}
}
