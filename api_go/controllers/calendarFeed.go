package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/service"
	"crypto/rand"
	"encoding/hex"
	"strings"
	"time"

	ics "github.com/arran4/golang-ical"
	"github.com/gofiber/fiber/v3"
)

func calendarFeedURL(c fiber.Ctx, token string) string {
	base := GetLocal[string](c, constants.AppBaseURL)
	return strings.TrimSuffix(base, "/") + "/public/calendar/" + token + ".ics"
}

// RotateCalendarToken godoc
// @Summary  Generate (or rotate) the personal calendar feed token. Calling this again replaces the previous token, which invalidates any previously subscribed feed URL.
// @Tags     users
// @Produce  json
// @Success  200  {object} dto.CalendarTokenDto
// @Failure  500  {object} map[string]string
// @Router   /v1/users/calendar-token [post]
func RotateCalendarToken(c fiber.Ctx) error {
	var userId = GetLocal[string](c, "userId")
	var userService = GetLocal[service.UserService](c, constants.UserService)

	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to generate token")
	}
	token := hex.EncodeToString(buf)

	if err := userService.SetIcalFeedToken(userId, token); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to store token")
	}
	return c.JSON(dto.CalendarTokenDto{Token: token, URL: calendarFeedURL(c, token)})
}

// GetCalendarToken godoc
// @Summary  Get the current calendar feed token and subscription URL
// @Tags     users
// @Produce  json
// @Success  200  {object} dto.CalendarTokenDto
// @Failure  404  {object} map[string]string
// @Router   /v1/users/calendar-token [get]
func GetCalendarToken(c fiber.Ctx) error {
	var userId = GetLocal[string](c, "userId")
	var userService = GetLocal[service.UserService](c, constants.UserService)

	token, err := userService.GetIcalFeedToken(userId)
	if err != nil || token == "" {
		return fiber.NewError(fiber.StatusNotFound, "no calendar token configured")
	}
	return c.JSON(dto.CalendarTokenDto{Token: token, URL: calendarFeedURL(c, token)})
}

// GetCalendarFeed godoc
// @Summary  Public ICS feed of all native club events of the token owner's clubs (from 3 months in the past onward). The token is the authentication.
// @Tags     public
// @Produce  text/calendar
// @Param    token  path  string  true  "Calendar feed token"
// @Success  200  {string} string
// @Failure  404  {object} map[string]string
// @Router   /public/calendar/{token}.ics [get]
func GetCalendarFeed(c fiber.Ctx) error {
	token := c.Params("token")
	if token == "" {
		return fiber.NewError(fiber.StatusNotFound, "unknown calendar token")
	}
	var userService = GetLocal[service.UserService](c, constants.UserService)
	userId, err := userService.FindUserIdByIcalFeedToken(token)
	if err != nil {
		return fiber.NewError(fiber.StatusNotFound, "unknown calendar token")
	}

	var clubEventService = GetLocal[service.ClubEventService](c, constants.ClubEventService)
	rows, err := clubEventService.ListForUserFeed(userId, time.Now().AddDate(0, -3, 0))
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to load events")
	}

	cal := ics.NewCalendar()
	cal.SetMethod(ics.MethodPublish)
	cal.SetProductId("-//SmartOrganizr//club-events//EN")
	for _, row := range rows {
		ev := cal.AddEvent(row.ID)
		ev.SetDtStampTime(row.UpdatedAt.UTC())
		ev.SetStartAt(row.StartDate.UTC())
		if row.EndDate.Valid {
			ev.SetEndAt(row.EndDate.Time.UTC())
		}
		ev.SetSummary(row.ClubName + ": " + row.Summary)
		if row.Location.Valid {
			ev.SetLocation(row.Location.String)
		}
		if row.Description.Valid {
			ev.SetDescription(row.Description.String)
		}
		if row.Cancelled {
			ev.SetStatus(ics.ObjectStatusCancelled)
		}
	}

	c.Set(fiber.HeaderContentType, "text/calendar; charset=utf-8")
	return c.SendString(cal.Serialize())
}
