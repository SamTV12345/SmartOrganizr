package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/mappers"
	"api_go/models"
	"api_go/service"
	"database/sql"
	"errors"
	"strconv"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
)

// GetParentDecks godoc
// @Summary  List all top-level folders for the user
// @Tags     elements
// @Produce  json
// @Success  200  {array}  dto.Folder
// @Router   /v1/elements/parentDecks [get]
func GetParentDecks(c fiber.Ctx) error {
	var userId = GetLocal[string](c, "userId")
	var folderService = GetLocal[service.FolderService](c, "folderService")
	var folders, err = folderService.FindAllParentDeckFolders(userId)
	if err != nil {
		log.Errorf("GetParentDecks failed for user %q: %v", userId, err)
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

// DeleteElement godoc
// @Summary  Delete a folder or note by id
// @Tags     elements
// @Param    elementid  path  string  true  "Element ID"
// @Success  204
// @Router   /v1/elements/{elementid} [delete]
func DeleteElement(c fiber.Ctx) error {
	var userId = GetLocal[string](c, "userId")
	var elementId = c.Params("elementId")

	var folderService = GetLocal[service.FolderService](c, "folderService")
	var noteService = GetLocal[service.NoteService](c, "noteService")

	lookedUpFolder, err := folderService.FindFolderByIdAndUser(elementId, userId)
	if err != nil {
		log.Errorf("DeleteElement failed to find element %q for user %q: %v", elementId, userId, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	if err := folderService.DeleteFolder(lookedUpFolder.Id, userId); err != nil {
		return c.SendStatus(fiber.StatusInternalServerError)
	}

	if err := noteService.DeleteNote(userId, elementId); err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			log.Errorf("DeleteElement failed to delete note %q for user %q: %v", elementId, userId, err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// GetNotes godoc
// @Summary  Paginated list of notes for the current user
// @Tags     elements
// @Produce  json
// @Param    page      query  int     false  "Page index (0-based)"
// @Param    noteName  query  string  false  "Optional name filter"
// @Success  200  {object} dto.PagedNoteRepresentationModelList
// @Router   /v1/elements/notes [get]
func GetNotes(c fiber.Ctx) error {
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
		log.Errorf("GetNotes failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	var notesDto = make([]dto.Note, 0)
	for _, note := range notes {
		notesDto = append(notesDto, *mappers.ConvertNoteDtoFromModel(&note, c))
	}

	var pagedNotes = dto.PagedNoteRepresentationModelList{
		Embedded: struct {
			NoteRepresentationModelList []dto.Note `json:"noteRepresentationModelList" validate:"required"`
		}{NoteRepresentationModelList: notesDto},
		Page: newPage(page, totalCount),
	}

	return c.JSON(pagedNotes)
}

// CreateFolder godoc
// @Summary  Create a folder
// @Tags     elements
// @Accept   json
// @Produce  json
// @Param    body  body  dto.FolderPostDto  true  "Folder payload"
// @Success  200   {object} dto.Folder
// @Router   /v1/elements/folders [post]
func CreateFolder(c fiber.Ctx) error {
	var userId = GetLocal[string](c, "userId")
	var folderService = GetLocal[service.FolderService](c, "folderService")
	var folderPostDto dto.FolderPostDto
	err := c.Bind().Body(&folderPostDto)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	var folder, errorWhenCreating = folderService.CreateFolder(folderPostDto, userId)
	if errorWhenCreating != nil {
		var errorType *fiber.Error
		if errors.As(errorWhenCreating, &errorType) {
			log.Errorf("CreateFolder failed for user %q: %v", userId, errorWhenCreating)
			return c.Status(errorType.Code).JSON(fiber.Map{
				"error": errorWhenCreating.Error(),
			})
		}

		log.Errorf("CreateFolder failed for user %q: %v", userId, errorWhenCreating)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": errorWhenCreating.Error(),
		})
	}
	var folderDto = mappers.ConvertFolderDtoFromModel(*folder, c)
	return c.JSON(folderDto)
}

// FindNextChildren godoc
// @Summary  List children (folders + notes) of a folder
// @Tags     elements
// @Produce  json
// @Param    folderId  path  string  true  "Parent folder ID"
// @Success  200  {array}  models.Element
// @Router   /v1/elements/{folderId}/children [get]
func FindNextChildren(c fiber.Ctx) error {
	var userId = GetLocal[string](c, "userId")
	var folderService = GetLocal[service.FolderService](c, "folderService")
	var folderId = c.Params("folderId")
	var elementsModel, err = folderService.FindNextChildren(folderId, userId)
	if err != nil {
		log.Errorf("FindNextChildren failed for folder %q user %q: %v", folderId, userId, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	var elementDto = make([]interface{}, 0)
	for _, element := range elementsModel {
		elementDto = append(elementDto, mappers.ConvertElementDtoFromModel(element, c))
	}
	return c.JSON(elementDto)
}

// SearchFolders godoc
// @Summary  Search folders (paginated)
// @Tags     elements
// @Produce  json
// @Param    page        query  int     true   "Page index (0-based)"
// @Param    folderName  query  string  false  "Folder name filter"
// @Success  200  {object} dto.PagedFolderRepresentationModelList
// @Router   /v1/elements/folders [get]
func SearchFolders(c fiber.Ctx) error {
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
		log.Errorf("SearchFolders failed for user %q search %q: %v", userId, search, errSearch)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": errSearch.Error(),
		})
	}

	var totalFolders, _ = folderService.CountFolders(userId, search)

	var folderDtos = make([]dto.Folder, 0)
	for _, fdto := range folders {
		folderDtos = append(folderDtos, mappers.ConvertFolderDtoFromModel(fdto, c))
	}

	var paged = dto.PagedFolderRepresentationModelList{
		Page: newPage(page, totalFolders),
		Embedded: struct {
			ElementRepresentationModelList []dto.Folder `json:"elementRepresentationModelList" validate:"required"`
		}{ElementRepresentationModelList: folderDtos},
	}

	return c.JSON(paged)
}

// CreateNote godoc
// @Summary  Create a note
// @Tags     elements
// @Accept   json
// @Produce  json
// @Param    body  body  dto.NotePostDto  true  "Note payload"
// @Success  200   {object} models.Note
// @Router   /v1/elements/notes [post]
func CreateNote(c fiber.Ctx) error {
	var notePostDto dto.NotePostDto
	if err := c.Bind().Body(&notePostDto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	var userId = GetLocal[string](c, "userId")
	var noteService = GetLocal[service.NoteService](c, "noteService")
	var note, err = noteService.CreateNote(userId, notePostDto)
	if err != nil {
		log.Errorf("CreateNote failed for user %q: %v", userId, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.JSON(note)
}

// UpdateFolder godoc
// @Summary  Update a folder
// @Tags     elements
// @Accept   json
// @Produce  json
// @Param    folderId  path  string                true  "Folder ID"
// @Param    body      body  dto.FolderPatchDto    true  "Patch payload"
// @Success  200       {object} dto.Folder
// @Router   /v1/elements/folders/{folderId} [patch]
func UpdateFolder(c fiber.Ctx) error {
	var folderId = c.Params("folderId")
	var userId = GetLocal[string](c, "userId")
	var folderService = GetLocal[service.FolderService](c, "folderService")
	var folderPatch dto.FolderPatchDto

	if err := c.Bind().Body(&folderPatch); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	var folder, err = folderService.FindFolderByIdAndUser(folderId, userId)
	if err != nil {
		log.Errorf("UpdateFolder failed to find folder %q for user %q: %v", folderId, userId, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{})
	}
	folder.Name = folderPatch.Name
	folder.Description = folderPatch.Description
	var parent *models.Folder
	if folderPatch.ParentId != "" {
		parent, err = folderService.FindFolderByIdAndUser(folderPatch.ParentId, userId)
		if err != nil {
			log.Errorf("UpdateFolder failed to find parent folder %q for user %q: %v", folderPatch.ParentId, userId, err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

	}
	folder.Parent = parent

	folder, err = folderService.UpdateFolder(userId, *folder)
	if err != nil {
		log.Errorf("UpdateFolder failed for folder %q user %q: %v", folderId, userId, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	var folderDto = mappers.ConvertFolderDtoFromModel(*folder, c)
	return c.JSON(folderDto)
}

// UpdateNote godoc
// @Summary  Update a note
// @Tags     elements
// @Accept   json
// @Produce  json
// @Param    noteId  path  string             true  "Note ID"
// @Param    body    body  dto.NotePostDto    true  "Note payload"
// @Success  200     {object} dto.Note
// @Router   /v1/elements/notes/{noteId} [patch]
func UpdateNote(c fiber.Ctx) error {
	var noteId = c.Params("noteId")
	var userId = GetLocal[string](c, "userId")
	var noteService = GetLocal[service.NoteService](c, "noteService")
	var note, err = noteService.LoadNote(noteId, userId)
	if err != nil {
		log.Errorf("UpdateNote failed to load note %q for user %q: %v", noteId, userId, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	var notePostDto dto.NotePostDto
	err = c.Bind().Body(&notePostDto)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	note.Description = notePostDto.Description
	note.NumberOfPages = notePostDto.NumberOfPages
	note.Name = notePostDto.Name

	var updatedNote, errUpdate = noteService.UpdateNote(userId, note)
	if errUpdate != nil {
		log.Errorf("UpdateNote failed for note %q user %q: %v", noteId, userId, errUpdate)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": errUpdate.Error(),
		})
	}
	var noteDto = mappers.ConvertNoteDtoFromModel(&updatedNote, c)
	return c.JSON(noteDto)
}

// GetParentOfNote godoc
// @Summary  Get the parent folder ID of a note
// @Tags     elements
// @Produce  plain
// @Param    noteId  path  string  true  "Note ID"
// @Success  200     {string} string
// @Router   /v1/elements/{noteId}/parent [get]
func GetParentOfNote(c fiber.Ctx) error {
	var userId = GetLocal[string](c, "userId")
	var noteId = c.Params("noteId")
	var folderService = GetLocal[service.FolderService](c, "noteService")
	var element, err = folderService.FindFolderByIdAndUser(noteId, userId)
	if err != nil {
		log.Errorf("GetParentOfNote failed for note %q user %q: %v", noteId, userId, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.SendString(element.Id)
}

// GetNoteasPDF godoc
// @Summary  Download the PDF attached to a note
// @Tags     elements
// @Produce  application/pdf
// @Param    noteId  path  string  true  "Note ID"
// @Success  200     {file} file
// @Router   /v1/elements/{noteId}/pdf [get]
func GetNoteasPDF(c fiber.Ctx) error {
	var userId = GetLocal[string](c, "userId")
	var noteId = c.Params("noteId")
	var noteService = GetLocal[service.NoteService](c, "noteService")
	var note, err = noteService.LoadNote(noteId, userId)
	if err != nil {
		log.Errorf("GetNoteasPDF failed to load note %q for user %q: %v", noteId, userId, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.Send(note.PDFContent)
}

// UpdatePDFOfNote godoc
// @Summary  Replace the PDF for a note (raw body)
// @Tags     elements
// @Accept   application/pdf
// @Produce  json
// @Param    noteId  path  string  true  "Note ID"
// @Success  200     {object} dto.Note
// @Router   /v1/elements/{noteId}/pdf [post]
func UpdatePDFOfNote(c fiber.Ctx) error {
	var userId = GetLocal[string](c, "userId")
	var noteId = c.Params("noteId")
	var noteService = GetLocal[service.NoteService](c, "noteService")
	var note, err = noteService.LoadNote(noteId, userId)
	if err != nil {
		log.Errorf("UpdatePDFOfNote failed to load note %q for user %q: %v", noteId, userId, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	var pdfContent = c.Body()
	note.PDFContent = pdfContent
	updatedNote, err := noteService.UpdateNote(userId, note)
	if err != nil {
		log.Errorf("UpdatePDFOfNote failed to update note %q for user %q: %v", noteId, userId, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	var noteDto = mappers.ConvertNoteDtoFromModel(&updatedNote, c)
	return c.JSON(noteDto)
}

// ExportPDFFromNotes godoc
// @Summary  Generate a combined PDF for all notes in a folder
// @Tags     elements
// @Produce  application/pdf
// @Param    folderId  path  string  true  "Folder ID"
// @Success  200       {file} file
// @Router   /v1/elements/{folderId}/export [get]
func ExportPDFFromNotes(c fiber.Ctx) error {
	folderservice := GetLocal[service.FolderService](c, constants.FolderService)
	userservice := GetLocal[service.UserService](c, constants.UserService)

	var folderId = c.Params("folderId")
	pdfContent, err := service.GeneratePDFForFolder(folderId, folderservice, userservice)
	if err != nil {
		log.Errorf("ExportPDFFromNotes failed for folder %q: %v", folderId, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", `inline; filename="folder.pdf"`)
	c.Set("Content-Length", strconv.Itoa(len(pdfContent)))
	return c.Send(pdfContent)
}

// GetNodeByID godoc
// @Summary  Get a note plus prev/next siblings
// @Tags     elements
// @Produce  json
// @Param    noteId  path  string  true  "Note ID"
// @Success  200     {object} dto.NoteDetailResponse
// @Router   /v1/elements/notes/{noteId} [get]
func GetNodeByID(c fiber.Ctx) error {
	var userId = GetLocal[string](c, "userId")
	var noteService = GetLocal[service.NoteService](c, "noteService")
	var noteId = c.Params("noteId")
	var foundNote, previousNote, nextNote, index, err = noteService.LoadNoteByParent(noteId, userId)

	if err != nil {
		log.Errorf("GetNodeByID failed for note %q user %q: %v", noteId, userId, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	var noteDetailDto = dto.NoteDetailResponse{
		Index:        index,
		CurrentNote:  mappers.ConvertNoteDtoFromModel(foundNote, c),
		NextNote:     mappers.ConvertNoteDtoFromModel(nextNote, c),
		PreviousNote: mappers.ConvertNoteDtoFromModel(previousNote, c),
	}

	return c.JSON(noteDetailDto)
}

// MoveToFolder godoc
// @Summary  Move an element to a different parent
// @Tags     elements
// @Param    firstElement  path  string  true  "Element ID to move"
// @Param    lastElement   path  string  true  "Target parent ID"
// @Success  204
// @Router   /v1/elements/{firstElement}/{lastElement} [patch]
func MoveToFolder(c fiber.Ctx) error {
	var userId = GetLocal[string](c, "userId")
	var folderService = GetLocal[service.FolderService](c, "folderService")
	var firstElement = c.Params("firstElement")
	var secondElement = c.Params("lastElement")

	if err := folderService.MoveToFolder(firstElement, secondElement, userId); err != nil {
		log.Errorf("MoveToFolder failed moving %q to %q for user %q: %v", firstElement, secondElement, userId, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.SendStatus(fiber.StatusNoContent)
}
