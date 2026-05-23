package mappers

import (
	"api_go/controllers/dto"
	"api_go/models"
	"strconv"

	"github.com/gofiber/fiber/v3"
)

func ConvertUserDtoFromModel(user models.User, c fiber.Ctx) dto.User {
	var dtoUser = dto.User{
		UserId:           user.UserId,
		Username:         user.Username,
		SideBarCollapsed: user.SideBarCollapsed,
	}

	if len(user.ProfilePic) > 0 {
		link := "/public/users/" + user.UserId + "/" + strconv.Itoa(len(user.ProfilePic)) + ".png"
		dtoUser.ProfilePicUrl = &link
	}
	return dtoUser
}
