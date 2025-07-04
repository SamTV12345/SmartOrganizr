package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/mappers"
	"api_go/service"
	"github.com/gofiber/fiber/v2"
)

func GetAllClubsForMe(c *fiber.Ctx) error {
	userId := GetLocal[string](c, "userId")
	clubService := GetLocal[service.ClubService](c, constants.ClubService)
	result, err := clubService.GetAllClubsForMyId(&userId)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}

	clubDtos := make([]dto.ClubDto, 0)

	for _, clubModel := range *result {
		clubDto := mappers.ConvertClubFromModelToDto(clubModel)
		clubDtos = append(clubDtos, clubDto)
	}

	return c.JSON(clubDtos)
}

func PostClub(c *fiber.Ctx) error {
	_ = GetLocal[string](c, "userId")
	clubService := GetLocal[service.ClubService](c, constants.ClubService)
	clubMemberService := GetLocal[service.ClubMemberService](c, constants.ClubMemberService)
	var club dto.ClubPostDto
	if err := c.BodyParser(&club); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	savedClub, err := clubService.CreateClub(club)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	clubFromModelToDto := mappers.ConvertClubFromModelToDto(*savedClub)

	clubMemberService.GetAllMembersForClub("TODO")
	return c.JSON(clubFromModelToDto)
}
