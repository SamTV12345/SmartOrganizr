package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/mappers"
	"api_go/service"
	"github.com/gofiber/fiber/v3"
	"time"
)

// GetEvents godoc
// @Summary  List events for a user since a given date
// @Tags     events
// @Produce  json
// @Param    userId  path   string  true   "User ID (must match authenticated user)"
// @Param    since   query  string  false  "Earliest event date (RFC3339)"
// @Success  200     {array}  dto.Event
// @Failure  400     {object} map[string]string
// @Failure  403     {object} map[string]string
// @Router   /v1/events/{userId} [get]
func GetEvents(c fiber.Ctx) error {
	userIdToRequest := c.Params("userId")
	var keycloakId = GetLocal[string](c, "userId")
	if userIdToRequest != keycloakId {
		return &fiber.Error{
			Code:    403,
			Message: "You are not allowed to access other users events",
		}
	}
	eventService := GetLocal[service.EventService](c, constants.EventService)
	var sinceDate = c.Query("since", time.Now().Format(time.RFC3339))
	// 2025-06-02T08:44:02.589Z
	parsedSinceDate, err := time.Parse(time.RFC3339, sinceDate)
	if err != nil {
		return &fiber.Error{
			Code:    400,
			Message: err.Error(),
		}
	}
	eventsLoaded, err := eventService.GetEventsOfUser(keycloakId, &parsedSinceDate)
	if err != nil {
		return &fiber.Error{
			Code:    403,
			Message: "You are not allowed to access other users events",
		}
	}

	var eventsDto = make([]dto.Event, 0)
	// Convert to dto
	for _, event := range eventsLoaded {
		eventsDto = append(eventsDto, mappers.ConvertEventModelToDto(event))
	}

	return c.JSON(eventsDto)
}
