package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/mappers"
	"api_go/models"
	"api_go/service"

	"github.com/gofiber/fiber/v3"
)

// UpdateClub godoc
// @Summary  Update a club's settings (manager only)
// @Tags     clubs
// @Accept   json
// @Produce  json
// @Param    clubId  path  string           true  "Club ID"
// @Param    body    body  dto.ClubPostDto  true  "Club settings payload"
// @Success  200     {object} dto.ClubDto
// @Router   /v1/clubs/{clubId} [patch]
func UpdateClub(c fiber.Ctx) error {
	clubMemberService := GetLocal[service.ClubMemberService](c, constants.ClubMemberService)
	clubService := GetLocal[service.ClubService](c, constants.ClubService)
	requesterId := GetLocal[string](c, "userId")
	clubId := c.Params("clubId")

	role, err := clubMemberService.GetRoleInClub(clubId, requesterId)
	if err != nil {
		return fiber.NewError(fiber.StatusForbidden, "no club access")
	}
	if role != models.Admin && role != models.CoAdmin {
		return fiber.NewError(fiber.StatusForbidden, "insufficient role permissions")
	}

	var body dto.ClubPostDto
	if err := c.Bind().Body(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	updated, err := clubService.UpdateClub(clubId, body)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(mappers.ConvertClubFromModelToDto(*updated))
}
