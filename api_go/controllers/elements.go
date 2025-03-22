package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/mappers"
	"api_go/service"
	"github.com/gofiber/fiber/v2"
	"strconv"
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
	var folderDtos = make([]dto.Folder, 0)
	for _, fdto := range folders {
		folderDtos = append(folderDtos, mappers.ConvertFolderDtoFromModel(fdto, c))
	}
	return c.JSON(folderDtos)
}

func GetNotes(c *fiber.Ctx) error {
	var userId = GetLocal[string](c, "userId")
	var noteService = GetLocal[service.NoteService](c, "noteService")
	var notes, err = noteService.LoadAllNotes(userId)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.JSON(notes)
}

func CreateFolder(c *fiber.Ctx) error {
	var userId = GetLocal[string](c, "userId")
	var folderService = GetLocal[service.FolderService](c, "folderService")
	var folderPostDto dto.FolderPostDto
	err := c.BodyParser(&folderPostDto)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	var folder, errorWhenCreating = folderService.CreateFolder(folderPostDto, userId)
	if errorWhenCreating != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": errorWhenCreating.Error(),
		})
	}
	var folderDto = mappers.ConvertFolderDtoFromModel(*folder, c)
	return c.JSON(folderDto)
}

func FindNextChildren(c *fiber.Ctx) error {
	var userId = GetLocal[string](c, "userId")
	var folderService = GetLocal[service.FolderService](c, "folderService")
	var folderId = c.Params("folderId")
	var folders, err = folderService.FindNextChildren(userId, folderId)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err,
		})
	}
	return c.JSON(folders)
}

func SearchFolders(c *fiber.Ctx) error {
	var userId = GetLocal[string](c, "userId")
	var folderService = GetLocal[service.FolderService](c, "folderService")
	var search = c.Query("folderName")
	var page, err = strconv.Atoi(c.Query("page"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid page number",
		})
	}
	var folders, errSearch = folderService.SearchFolders(userId, page, search)
	if errSearch != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err,
		})
	}

	var totalFolders, _ = folderService.CountFolders(userId, search)
	remaningItems := totalFolders - (page+1)*constants.CurrentPageSize

	links := make(map[string]dto.Link)

	if remaningItems > 0 {
		links["next"] = dto.Link{
			Href: mappers.CreateHyperlink(c, "/api/v1/folders?page="+strconv.Itoa(page+1)+"&folderName="+search),
		}
	}

	var folderDtos = make([]dto.Folder, 0)
	for _, fdto := range folders {
		folderDtos = append(folderDtos, mappers.ConvertFolderDtoFromModel(fdto, c))
	}

	var paged = dto.PagedFolderRepresentationModelList{
		Page: struct {
			Size int `json:"size"`
		}{Size: constants.CurrentPageSize},
		Links: links,
		Embedded: struct {
			ElementRepresentationModelList []dto.Folder `json:"elementRepresentationModelList"`
		}{ElementRepresentationModelList: folderDtos},
	}

	return c.JSON(paged)
}
