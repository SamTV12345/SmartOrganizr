package controllers

import (
	"api_go/service"
	"github.com/gofiber/fiber/v2"
)

func GetParentDecks(c *fiber.Ctx) error {
	var userId = GetLocal[string](c, "userId")
	var folderService = GetLocal[service.FolderService](c, "folderService")
	var folders, err = folderService.FindAllParentDeckFolders(userId)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.JSON(folders)
}
