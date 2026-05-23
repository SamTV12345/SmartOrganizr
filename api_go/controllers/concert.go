package controllers

import (
	"api_go/controllers/dto"
	"api_go/mappers"
	"api_go/service"
	"github.com/gofiber/fiber/v3"
)

// GetConcertsOfUser godoc
// @Summary  List concerts for the current user
// @Tags     concerts
// @Produce  json
// @Success  200  {array}  dto.ConcertDto
// @Failure  500  {object} map[string]string
// @Router   /v1/concerts [get]
func GetConcertsOfUser(c fiber.Ctx) error {
	userId := GetLocal[string](c, "userId")
	concertService := GetLocal[service.ConcertService](c, "concertService")
	concerts, err := concertService.LoadAllConcerts(userId)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	concertDtos := make([]dto.ConcertDto, 0, len(concerts))
	for _, concert := range concerts {
		concertDtos = append(concertDtos, mappers.ConvertConcertModelToDto(concert, c))
	}
	return c.JSON(concertDtos)
}

// CreateConcert godoc
// @Summary  Create a new concert
// @Tags     concerts
// @Accept   json
// @Produce  json
// @Param    body  body  dto.ConcertPostDto  true  "Concert payload"
// @Success  200   {object} dto.ConcertDto
// @Failure  400   {object} map[string]string
// @Failure  500   {object} map[string]string
// @Router   /v1/concerts [post]
func CreateConcert(c fiber.Ctx) error {
	userId := GetLocal[string](c, "userId")
	concertService := GetLocal[service.ConcertService](c, "concertService")
	var concertPostDto dto.ConcertPostDto
	err := c.Bind().Body(&concertPostDto)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": error.Error(err),
		})
	}
	concert, err := concertService.CreateConcert(userId, concertPostDto)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(mappers.ConvertConcertModelToDto(*concert, c))
}

// GetConcert godoc
// @Summary  Get a single concert
// @Tags     concerts
// @Produce  json
// @Param    concertId  path  string  true  "Concert ID"
// @Success  200        {object} dto.ConcertDto
// @Failure  500        {object} map[string]string
// @Router   /v1/concerts/{concertId} [get]
func GetConcert(c fiber.Ctx) error {
	userId := GetLocal[string](c, "userId")
	concertId := c.Params("concertId")
	concertService := GetLocal[service.ConcertService](c, "concertService")
	concert, err := concertService.LoadConcert(userId, concertId)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.JSON(mappers.ConvertConcertModelToDto(*concert, c))
}

// DeleteConcert godoc
// @Summary  Delete a concert
// @Tags     concerts
// @Param    concertId  path  string  true  "Concert ID"
// @Success  204
// @Failure  500        {object} map[string]string
// @Router   /v1/concerts/{concertId} [delete]
func DeleteConcert(c fiber.Ctx) error {
	userId := GetLocal[string](c, "userId")
	concertId := c.Params("concertId")
	concertService := GetLocal[service.ConcertService](c, "concertService")
	err := concertService.DeleteConcert(userId, concertId)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.SendStatus(fiber.StatusNoContent)
}
