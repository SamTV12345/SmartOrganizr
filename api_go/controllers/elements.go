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
	var pageArg *int
	var page, errConv = strconv.Atoi(c.Query("page"))
	var nameStr *string
	if errConv != nil {
		pageArg = nil
	} else {
		pageArg = &page
	}

	var name = c.Query("noteName")
	if name != "" {
		nameStr = &name
	} else {
		nameStr = nil
	}

	var userId = GetLocal[string](c, "userId")
	var noteService = GetLocal[service.NoteService](c, "noteService")
	var notes, totalCount, err = noteService.LoadAllNotes(userId, pageArg, nameStr)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	var notesDto = make([]dto.Note, 0)
	for _, note := range notes {
		notesDto = append(notesDto, mappers.ConvertNoteDtoFromModel(note, c))
	}

	var links = make(map[string]dto.Link)
	if totalCount > (page+1)*constants.CurrentPageSize {
		links["next"] = dto.Link{
			Href: mappers.CreateHyperlink(c, "/api/v1/elements/notes?page="+strconv.Itoa(page+1)),
		}
	}

	var pagedNotes = dto.PagedNoteRepresentationModelList{
		Embedded: struct {
			NoteRepresentationModelList []dto.Note `json:"noteRepresentationModelList"`
		}{NoteRepresentationModelList: notesDto},
		Page: struct {
			Size int `json:"size"`
		}{Size: constants.CurrentPageSize},
		Links: links,
	}

	return c.JSON(pagedNotes)
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
	var elementsModel, err = folderService.FindNextChildren(folderId, userId)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err,
		})
	}
	var elementDto = make([]interface{}, 0)
	for _, element := range elementsModel {
		elementDto = append(elementDto, mappers.ConvertElementDtoFromModel(element, c))
	}
	return c.JSON(elementDto)
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

func CreateNote(c *fiber.Ctx) error {
	var notePostDto dto.NotePostDto
	if err := c.BodyParser(&notePostDto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	var userId = GetLocal[string](c, "userId")
	var noteService = GetLocal[service.NoteService](c, "noteService")
	var note, err = noteService.CreateNote(userId, notePostDto)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.JSON(note)
}

func GetParentOfNote(c *fiber.Ctx) error {
	var userId = GetLocal[string](c, "userId")
	var noteId = c.Params("noteId")
	var folderService = GetLocal[service.FolderService](c, "noteService")
	var element, err = folderService.FindFolderByIdAndUser(noteId, userId)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.SendString(element.Id)
}

func GetNoteasPDF(c *fiber.Ctx) error {
	var userId = GetLocal[string](c, "userId")
	var noteId = c.Params("noteId")
	var noteService = GetLocal[service.NoteService](c, "noteService")
	var note, err = noteService.LoadNote(noteId, userId)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.Send(note.PDFContent)
}

func UpdatePDFOfNote(c *fiber.Ctx) error {
	var userId = GetLocal[string](c, "userId")
	var noteId = c.Params("noteId")
	var noteService = GetLocal[service.NoteService](c, "noteService")
	var note, err = noteService.LoadNote(noteId, userId)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	var pdfContent = c.Body()
	note.PDFContent = pdfContent
	updatedNote, err := noteService.UpdateNote(userId, note)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	var noteDto = mappers.ConvertNoteDtoFromModel(updatedNote, c)
	return c.JSON(noteDto)
}

func ExportPDFFromNotes(c *fiber.Ctx) error {
	userId := GetLocal[string](c, "userId")
	folderservice := GetLocal[service.FolderService](c, constants.FolderService)
	userservice := GetLocal[service.UserService](c, constants.UserService)

	var folderId = c.Params("folderId")
	pdfContent, err := service.GeneratePDFForFolder(folderId, folderservice, userId, userservice)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	c.Set("Content-Type", "application/pdf")
	return c.Send(pdfContent)
}
