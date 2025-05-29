package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/mappers"
	"api_go/service"
	"github.com/gofiber/fiber/v2"
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

	eventsLoaded, err := eventService.GetEventsOfUser(keycloakId)
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
