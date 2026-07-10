package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/service"
	"database/sql"
	"errors"
	"time"

	"github.com/gofiber/fiber/v3"
)

func clubEventService(c fiber.Ctx) *service.ClubEventService {
	svc := GetLocal[service.ClubEventService](c, constants.ClubEventService)
	return &svc
}

// mapServiceError maps known service errors to HTTP statuses.
func mapServiceError(err error) error {
	switch {
	case errors.Is(err, service.ErrNoClubAccess):
		return fiber.NewError(fiber.StatusForbidden, err.Error())
	case errors.Is(err, service.ErrManageForbidden):
		return fiber.NewError(fiber.StatusForbidden, err.Error())
	case errors.Is(err, service.ErrLastLeiter):
		return fiber.NewError(fiber.StatusConflict, err.Error())
	case errors.Is(err, sql.ErrNoRows):
		return fiber.NewError(fiber.StatusNotFound, "not found")
	default:
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
}

func parseSince(c fiber.Ctx) time.Time {
	if raw := c.Query("since"); raw != "" {
		if t, err := time.Parse(time.RFC3339, raw); err == nil {
			return t
		}
	}
	return time.Unix(0, 0)
}

// ListClubEvents godoc
// @Summary  List a club's upcoming native events
// @Tags     club-events
// @Produce  json
// @Param    clubId  path   string  true   "Club ID"
// @Param    since   query  string  false  "RFC3339 lower bound"
// @Success  200     {array}  dto.ClubEventDto
// @Router   /v1/clubs/{clubId}/events [get]
func ListClubEvents(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	svc := clubEventService(c)
	events, err := svc.ListForClub(c.Params("clubId"), userID, parseSince(c))
	if err != nil {
		return mapServiceError(err)
	}
	return c.JSON(events)
}

// CreateClubEvent godoc
// @Summary  Create a native club event
// @Tags     club-events
// @Accept   json
// @Produce  json
// @Param    clubId  path  string                  true  "Club ID"
// @Param    body    body  dto.ClubEventUpsertDto   true  "Event payload"
// @Success  200     {object} dto.ClubEventDto
// @Router   /v1/clubs/{clubId}/events [post]
func CreateClubEvent(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	var body dto.ClubEventUpsertDto
	if err := c.Bind().Body(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	event, err := clubEventService(c).Create(c.Params("clubId"), userID, body)
	if err != nil {
		return mapServiceError(err)
	}
	return c.JSON(event)
}

// UpdateClubEvent godoc
// @Summary  Update a native club event
// @Tags     club-events
// @Accept   json
// @Produce  json
// @Param    clubId   path  string                  true  "Club ID"
// @Param    eventId  path  string                  true  "Event ID"
// @Param    body     body  dto.ClubEventUpsertDto   true  "Event payload"
// @Success  200      {object} dto.ClubEventDto
// @Router   /v1/clubs/{clubId}/events/{eventId} [put]
func UpdateClubEvent(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	var body dto.ClubEventUpsertDto
	if err := c.Bind().Body(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	event, err := clubEventService(c).Update(c.Params("clubId"), userID, c.Params("eventId"), body)
	if err != nil {
		return mapServiceError(err)
	}
	return c.JSON(event)
}

// CancelClubEvent godoc
// @Summary  Soft-cancel a native club event
// @Tags     club-events
// @Param    clubId   path  string  true  "Club ID"
// @Param    eventId  path  string  true  "Event ID"
// @Success  204
// @Router   /v1/clubs/{clubId}/events/{eventId}/cancel [post]
func CancelClubEvent(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	if err := clubEventService(c).Cancel(c.Params("clubId"), userID, c.Params("eventId")); err != nil {
		return mapServiceError(err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// DeleteClubEvent godoc
// @Summary  Delete a native club event
// @Tags     club-events
// @Param    clubId   path  string  true  "Club ID"
// @Param    eventId  path  string  true  "Event ID"
// @Success  204
// @Router   /v1/clubs/{clubId}/events/{eventId} [delete]
func DeleteClubEvent(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	if err := clubEventService(c).Delete(c.Params("clubId"), userID, c.Params("eventId")); err != nil {
		return mapServiceError(err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// RespondToClubEvent godoc
// @Summary  Upsert the caller's RSVP to a club event
// @Tags     club-events
// @Accept   json
// @Param    clubId   path  string                    true  "Club ID"
// @Param    eventId  path  string                    true  "Event ID"
// @Param    body     body  dto.ClubEventResponseDto   true  "Response payload"
// @Success  204
// @Router   /v1/clubs/{clubId}/events/{eventId}/response [put]
func RespondToClubEvent(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	var body dto.ClubEventResponseDto
	if err := c.Bind().Body(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	if err := clubEventService(c).Respond(c.Params("clubId"), userID, c.Params("eventId"), body); err != nil {
		return mapServiceError(err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// GetClubEventAttendance godoc
// @Summary  Get the visibility-filtered attendance matrix
// @Tags     club-events
// @Produce  json
// @Param    clubId   path  string  true  "Club ID"
// @Param    eventId  path  string  true  "Event ID"
// @Success  200      {object} dto.AttendanceDto
// @Router   /v1/clubs/{clubId}/events/{eventId}/attendance [get]
func GetClubEventAttendance(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	att, err := clubEventService(c).Attendance(c.Params("clubId"), userID, c.Params("eventId"))
	if err != nil {
		return mapServiceError(err)
	}
	return c.JSON(att)
}

// ListMyClubEvents godoc
// @Summary  List native events across all of the caller's clubs
// @Tags     club-events
// @Produce  json
// @Param    since  query  string  false  "RFC3339 lower bound"
// @Success  200    {array}  dto.ClubEventDto
// @Router   /v1/club-events [get]
func ListMyClubEvents(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	events, err := clubEventService(c).ListForUser(userID, parseSince(c))
	if err != nil {
		return mapServiceError(err)
	}
	return c.JSON(events)
}
