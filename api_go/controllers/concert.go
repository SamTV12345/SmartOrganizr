package controllers

import (
	"api_go/controllers/dto"
	"api_go/service"
	"github.com/gofiber/fiber/v2"
)

func GetConcertsOfUser(c *fiber.Ctx) error {
	userId := GetLocal[string](c, "userId")
	concertService := GetLocal[service.ConcertService](c, "concertService")
	concerts, err := concertService.LoadAllConcerts(userId)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.JSON(concerts)
}

func CreateConcert(c *fiber.Ctx) error {
	userId := GetLocal[string](c, "userId")
	concertService := GetLocal[service.ConcertService](c, "concertService")
	var concertPostDto dto.ConcertPostDto
	err := c.BodyParser(concertPostDto)
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

	return c.JSON(concert)
}

func GetConcert(c *fiber.Ctx) error {
	userId := GetLocal[string](c, "userId")
	concertId := c.Params("concertId")
	concertService := GetLocal[service.ConcertService](c, "concertService")
	concert, err := concertService.LoadConcert(userId, concertId)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.JSON(concert)
}

func DeleteConcert(c *fiber.Ctx) error {
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
