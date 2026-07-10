package controllers

import (
	"api_go/controllers/dto"
	"api_go/mappers"
	"api_go/service"
	"errors"

	"github.com/gofiber/fiber/v3"
)

// mapConcertError maps known concert service errors to HTTP statuses.
func mapConcertError(err error) error {
	switch {
	case errors.Is(err, service.ErrConcertNotFound):
		return fiber.NewError(fiber.StatusNotFound, err.Error())
	case errors.Is(err, service.ErrNoteNotOwned):
		return fiber.NewError(fiber.StatusForbidden, err.Error())
	default:
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
}

// GetConcertsOfUser godoc
// @Summary  List concerts for the current user (without their note program)
// @Tags     concerts
// @Produce  json
// @Success  200  {array}  dto.ConcertDto
// @Router   /v1/concerts [get]
func GetConcertsOfUser(c fiber.Ctx) error {
	userId := GetLocal[string](c, "userId")
	concertService := GetLocal[service.ConcertService](c, "concertService")
	concerts, err := concertService.LoadAllConcerts(userId)
	if err != nil {
		return mapConcertError(err)
	}
	concertDtos := make([]dto.ConcertDto, 0, len(concerts))
	for _, concert := range concerts {
		concertDtos = append(concertDtos, mappers.ConvertConcertModelToDto(concert, c))
	}
	return c.JSON(concertDtos)
}

// CreateConcert godoc
// @Summary  Create a new concert, optionally with an ordered list of note ids
// @Tags     concerts
// @Accept   json
// @Produce  json
// @Param    body  body  dto.ConcertPostDto  true  "Concert payload"
// @Success  200   {object} dto.ConcertDto
// @Router   /v1/concerts [post]
func CreateConcert(c fiber.Ctx) error {
	userId := GetLocal[string](c, "userId")
	concertService := GetLocal[service.ConcertService](c, "concertService")
	var concertPostDto dto.ConcertPostDto
	if err := c.Bind().Body(&concertPostDto); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	concert, err := concertService.CreateConcert(userId, concertPostDto)
	if err != nil {
		return mapConcertError(err)
	}

	return c.JSON(mappers.ConvertConcertModelToDto(*concert, c))
}

// GetConcert godoc
// @Summary  Get a single concert including its ordered note program
// @Tags     concerts
// @Produce  json
// @Param    concertId  path  string  true  "Concert ID"
// @Success  200        {object} dto.ConcertDto
// @Router   /v1/concerts/{concertId} [get]
func GetConcert(c fiber.Ctx) error {
	userId := GetLocal[string](c, "userId")
	concertId := c.Params("concertId")
	concertService := GetLocal[service.ConcertService](c, "concertService")
	concert, err := concertService.LoadConcert(userId, concertId)
	if err != nil {
		return mapConcertError(err)
	}
	return c.JSON(mappers.ConvertConcertModelToDto(*concert, c))
}

// UpdateConcert godoc
// @Summary  Update a concert and replace its ordered note program
// @Tags     concerts
// @Accept   json
// @Produce  json
// @Param    concertId  path  string              true  "Concert ID"
// @Param    body       body  dto.ConcertPostDto  true  "Concert payload incl. the complete ordered note id list"
// @Success  200        {object} dto.ConcertDto
// @Router   /v1/concerts/{concertId} [put]
func UpdateConcert(c fiber.Ctx) error {
	userId := GetLocal[string](c, "userId")
	concertId := c.Params("concertId")
	concertService := GetLocal[service.ConcertService](c, "concertService")
	var concertPostDto dto.ConcertPostDto
	if err := c.Bind().Body(&concertPostDto); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	concert, err := concertService.UpdateConcert(userId, concertId, concertPostDto)
	if err != nil {
		return mapConcertError(err)
	}
	return c.JSON(mappers.ConvertConcertModelToDto(*concert, c))
}

// DeleteConcert godoc
// @Summary  Delete a concert
// @Tags     concerts
// @Param    concertId  path  string  true  "Concert ID"
// @Success  204
// @Router   /v1/concerts/{concertId} [delete]
func DeleteConcert(c fiber.Ctx) error {
	userId := GetLocal[string](c, "userId")
	concertId := c.Params("concertId")
	concertService := GetLocal[service.ConcertService](c, "concertService")
	if err := concertService.DeleteConcert(userId, concertId); err != nil {
		return mapConcertError(err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}
