package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/service"

	"github.com/gofiber/fiber/v3"
)

func clubEventProgramService(c fiber.Ctx) *service.ClubEventProgramService {
	svc := GetLocal[service.ClubEventProgramService](c, constants.ClubEventProgramService)
	return &svc
}

// GetClubEventProgram godoc
// @Summary  Get the ordered program (setlist) of a club event
// @Tags     club-event-program
// @Produce  json
// @Param    clubId   path  string  true  "Club ID"
// @Param    eventId  path  string  true  "Event ID"
// @Success  200      {array}  dto.ClubEventProgramEntryDto
// @Router   /v1/clubs/{clubId}/events/{eventId}/program [get]
func GetClubEventProgram(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	entries, err := clubEventProgramService(c).List(c.Params("clubId"), userID, c.Params("eventId"))
	if err != nil {
		return mapServiceError(err)
	}
	return c.JSON(entries)
}

// ReplaceClubEventProgram godoc
// @Summary  Replace the whole ordered program of a club event
// @Tags     club-event-program
// @Accept   json
// @Produce  json
// @Param    clubId   path  string                          true  "Club ID"
// @Param    eventId  path  string                          true  "Event ID"
// @Param    body     body  dto.ClubEventProgramReplaceDto   true  "Ordered program entries"
// @Success  200      {array}  dto.ClubEventProgramEntryDto
// @Router   /v1/clubs/{clubId}/events/{eventId}/program [put]
func ReplaceClubEventProgram(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	var body dto.ClubEventProgramReplaceDto
	if err := c.Bind().Body(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	entries, err := clubEventProgramService(c).Replace(c.Params("clubId"), userID, c.Params("eventId"), body)
	if err != nil {
		return mapServiceError(err)
	}
	return c.JSON(entries)
}
