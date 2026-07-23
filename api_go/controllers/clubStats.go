package controllers

import (
	"api_go/constants"
	"api_go/service"
	"errors"
	"strconv"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
)

func clubStatsService(c fiber.Ctx) *service.ClubStatsService {
	svc := GetLocal[service.ClubStatsService](c, constants.ClubStatsService)
	return &svc
}

// GetClubAttendanceStats godoc
// @Summary  Per-member and per-section attendance rates for a club
// @Tags     clubs
// @Produce  json
// @Param    clubId      path   string  true   "Club ID"
// @Param    windowDays  query  int     false  "Recent-window size in days (default 90)"
// @Success  200         {object}  dto.AttendanceStatsDto
// @Router   /v1/clubs/{clubId}/stats/attendance [get]
func GetClubAttendanceStats(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	windowDays, _ := strconv.Atoi(c.Query("windowDays"))
	stats, err := clubStatsService(c).Attendance(c.Params("clubId"), userID, windowDays)
	if err != nil {
		if errors.Is(err, service.ErrNoClubAccess) {
			return fiber.NewError(fiber.StatusForbidden, err.Error())
		}
		log.Errorf("attendance stats for club %s: %v", c.Params("clubId"), err)
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(stats)
}
