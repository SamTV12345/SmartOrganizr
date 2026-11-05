package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/service"
	"errors"

	"github.com/gofiber/fiber/v3"
)

func reminderService(c fiber.Ctx) *service.ReminderService {
	svc := GetLocal[service.ReminderService](c, constants.ReminderService)
	return &svc
}

func mapReminderError(err error) error {
	if errors.Is(err, service.ErrReminderHours) || errors.Is(err, service.ErrEventCancelled) {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return mapServiceError(err)
}

// GetClubReminderSettings godoc
// @Summary  Automatic reminders for open event responses (hoursBefore null = off)
// @Tags     club-reminders
// @Produce  json
// @Param    clubId  path  string  true  "Club ID"
// @Success  200     {object}  dto.ClubReminderSettingsDto
// @Router   /v1/clubs/{clubId}/reminder-settings [get]
func GetClubReminderSettings(c fiber.Ctx) error {
	out, err := reminderService(c).GetSettings(c.Params("clubId"), GetLocal[string](c, "userId"))
	if err != nil {
		return mapReminderError(err)
	}
	return c.JSON(out)
}

// UpdateClubReminderSettings godoc
// @Summary  Turn automatic reminders on (hours before the event) or off (null)
// @Tags     club-reminders
// @Accept   json
// @Produce  json
// @Param    clubId  path  string                       true  "Club ID"
// @Param    body    body  dto.ClubReminderSettingsDto  true  "Settings"
// @Success  200     {object}  dto.ClubReminderSettingsDto
// @Router   /v1/clubs/{clubId}/reminder-settings [put]
func UpdateClubReminderSettings(c fiber.Ctx) error {
	var body dto.ClubReminderSettingsDto
	if err := c.Bind().Body(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	out, err := reminderService(c).UpdateSettings(c.Params("clubId"), GetLocal[string](c, "userId"), body)
	if err != nil {
		return mapReminderError(err)
	}
	return c.JSON(out)
}

// RemindOpenResponses godoc
// @Summary  Remind every member who has not answered this event yet (12 h cooldown per member)
// @Tags     club-reminders
// @Produce  json
// @Param    clubId   path  string  true  "Club ID"
// @Param    eventId  path  string  true  "Event ID"
// @Success  200      {object}  dto.ClubRemindResultDto
// @Router   /v1/clubs/{clubId}/events/{eventId}/remind [post]
func RemindOpenResponses(c fiber.Ctx) error {
	n, err := reminderService(c).RemindNow(c.Params("clubId"), GetLocal[string](c, "userId"), c.Params("eventId"))
	if err != nil {
		return mapReminderError(err)
	}
	return c.JSON(dto.ClubRemindResultDto{Sent: n})
}
