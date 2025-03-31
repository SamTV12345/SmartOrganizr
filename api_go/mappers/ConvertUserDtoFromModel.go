package mappers

import (
	"api_go/controllers/dto"
	"api_go/models"
	"github.com/gofiber/fiber/v2"
	"strconv"
)

func ConvertUserDtoFromModel(user models.User, c *fiber.Ctx) dto.User {
	var dtoUser = dto.User{
		UserId:           user.UserId,
		Username:         user.Username,
		SideBarCollapsed: user.SideBarCollapsed,
	}

	if len(user.ProfilePic) > 0 {
		link := CreateHyperlink(c, "/public/users/"+user.UserId+"/"+strconv.Itoa(len(user.ProfilePic))+".png")
		dtoUser.ProfilePicUrl = &link
	}
	return dtoUser
}
