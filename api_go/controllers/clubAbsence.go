package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/service"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
)

func clubAbsenceService(c fiber.Ctx) *service.ClubAbsenceService {
	svc := GetLocal[service.ClubAbsenceService](c, constants.ClubAbsenceService)
	return &svc
}

// ListMyClubAbsences godoc
// @Summary  List the caller's own absences in a club
// @Tags     club-absence
// @Produce  json
// @Param    clubId  path  string  true  "Club ID"
// @Success  200     {array}  dto.ClubAbsenceDto
// @Router   /v1/clubs/{clubId}/absences [get]
func ListMyClubAbsences(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	absences, err := clubAbsenceService(c).ListMine(c.Params("clubId"), userID)
	if err != nil {
		log.Errorf("list own absences: %v", err)
		return mapServiceError(err)
	}
	return c.JSON(absences)
}

// CreateClubAbsence godoc
// @Summary  Declare an absence range for the caller
// @Tags     club-absence
// @Accept   json
// @Produce  json
// @Param    clubId  path  string                     true  "Club ID"
// @Param    body    body  dto.ClubAbsenceUpsertDto   true  "Absence payload"
// @Success  200     {object} dto.ClubAbsenceDto
// @Router   /v1/clubs/{clubId}/absences [post]
func CreateClubAbsence(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	var body dto.ClubAbsenceUpsertDto
	if err := c.Bind().Body(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	absence, err := clubAbsenceService(c).Create(c.Params("clubId"), userID, body)
	if err != nil {
		log.Errorf("create absence: %v", err)
		return mapServiceError(err)
	}
	return c.JSON(absence)
}

// DeleteClubAbsence godoc
// @Summary  Delete one of the caller's own absences
// @Tags     club-absence
// @Param    clubId     path  string  true  "Club ID"
// @Param    absenceId  path  string  true  "Absence ID"
// @Success  204
// @Router   /v1/clubs/{clubId}/absences/{absenceId} [delete]
func DeleteClubAbsence(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	if err := clubAbsenceService(c).Delete(c.Params("clubId"), userID, c.Params("absenceId")); err != nil {
		log.Errorf("delete absence: %v", err)
		return mapServiceError(err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// ListClubAbsences godoc
// @Summary  List all members' absences (managers only)
// @Tags     club-absence
// @Produce  json
// @Param    clubId  path  string  true  "Club ID"
// @Success  200     {array}  dto.ClubAbsenceDto
// @Router   /v1/clubs/{clubId}/absences/overview [get]
func ListClubAbsences(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	absences, err := clubAbsenceService(c).ListAll(c.Params("clubId"), userID)
	if err != nil {
		log.Errorf("list all absences: %v", err)
		return mapServiceError(err)
	}
	return c.JSON(absences)
}

// GetClubEventAvailability godoc
// @Summary  Inferred expected attendance for an event derived from absences
// @Tags     club-absence
// @Produce  json
// @Param    clubId   path  string  true  "Club ID"
// @Param    eventId  path  string  true  "Event ID"
// @Success  200      {object} dto.EventAvailabilityDto
// @Router   /v1/clubs/{clubId}/events/{eventId}/availability [get]
func GetClubEventAvailability(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	availability, err := clubAbsenceService(c).Availability(c.Params("clubId"), userID, c.Params("eventId"))
	if err != nil {
		log.Errorf("event availability: %v", err)
		return mapServiceError(err)
	}
	return c.JSON(availability)
}
