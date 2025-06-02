package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/mappers"
	"api_go/service"
	"github.com/gofiber/fiber/v2"
	"time"
)

func GetEvents(c *fiber.Ctx) error {
	userIdToRequest := c.Params("userId")
	var keycloakId = GetLocal[string](c, "userId")
	if userIdToRequest != keycloakId {
		return &fiber.Error{
			Code:    403,
			Message: "You are not allowed to access other users events",
		}
	}
	eventService := mappers.GetLocal[service.EventService](c, constants.EventService)
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
