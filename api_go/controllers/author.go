package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/mappers"
	"api_go/service"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"strconv"
	"strings"
)

// GetAuthors godoc
// @Summary  List authors for the current user
// @Tags     authors
// @Produce  json
// @Param    page  query  int     true   "Page index (0-based)"
// @Param    name  query  string  false  "Optional name filter"
// @Success  200   {object}  dto.PagedAuthorRepresentationModelList
// @Failure  400   {object}  map[string]string
// @Router   /v1/authors [get]
func GetAuthors(c fiber.Ctx) error {
	var pageStr = c.Query("page")
	var nameStr = c.Query("name")
	if pageStr == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Page is required",
		})
	}
	var page, err = strconv.Atoi(pageStr)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid page number",
		})
	}
	var authorService = GetLocal[service.AuthorService](c, "authorService")
	var userId = GetLocal[string](c, "userId")

	var authorPage dto.PagedAuthorRepresentationModelList
	var count *int

	if nameStr != "" {
		authors, _ := authorService.FindByCreatorAndSearchText(userId, nameStr)
		count, _ = authorService.CountFindByCreatorAndSearchText(userId, nameStr)
		authorDto := make([]dto.Author, 0)

		for _, author := range authors {
			authorDto = append(authorDto, mappers.ConvertAuthorDtoFromModel(author))
		}

		authorPage = dto.PagedAuthorRepresentationModelList{
			Embedded: struct {
				AuthorRepresentationModelList []dto.Author `json:"authorRepresentationModelList" validate:"required"`
			}{AuthorRepresentationModelList: authorDto},
		}
	} else {
		authors, _ := authorService.FindAllByCreator(userId, page)
		authorDto := make([]dto.Author, 0)
		for _, author := range authors {
			authorDto = append(authorDto, mappers.ConvertAuthorDtoFromModel(author))
		}
		count, _ = authorService.CountFindAllByCreator(userId)
		authorPage = dto.PagedAuthorRepresentationModelList{
			Embedded: struct {
				AuthorRepresentationModelList []dto.Author `json:"authorRepresentationModelList" validate:"required"`
			}{AuthorRepresentationModelList: authorDto},
		}
	}

	authorPage.Page = newPage(page, *count)

	return c.JSON(authorPage)
}

// UpdateAuthor godoc
// @Summary  Update an author
// @Tags     authors
// @Accept   json
// @Produce  json
// @Param    authorId  path  string                   true  "Author ID"
// @Param    body      body  dto.AuthorPatchDto       true  "Author patch payload"
// @Success  200       {object}  dto.Author
// @Router   /v1/authors/{authorId} [patch]
func UpdateAuthor(c fiber.Ctx) error {
	var authorService = GetLocal[service.AuthorService](c, constants.AuthorService)
	var userId = GetLocal[string](c, "userId")
	var authorId = c.Params("authorId")
	var authorPatchDto dto.AuthorPatchDto

	if err := c.Bind().Body(&authorPatchDto); err != nil {
		return err
	}
	author, err := authorService.UpdateAuthor(authorPatchDto, userId, authorId)

	if err != nil {
		log.Error(err)
		return err
	}
	var authorDto = mappers.ConvertAuthorDtoFromModel(author)
	return c.JSON(authorDto)
}

// DeleteAuthor godoc
// @Summary  Delete an author
// @Tags     authors
// @Param    authorId  path  string  true  "Author ID"
// @Success  204
// @Failure  404       {object}  map[string]string
// @Router   /v1/authors/{authorId} [delete]
func DeleteAuthor(c fiber.Ctx) error {
	var authorId = c.Params("authorId")
	var authorService = GetLocal[service.AuthorService](c, constants.AuthorService)
	var userService = GetLocal[service.UserService](c, constants.UserService)
	var userId = GetLocal[string](c, "userId")
	var _, err = userService.LoadUser(userId)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "User not found",
		})
	}
	var _, errorFromFindById = authorService.LoadAuthorById(authorId, userId)
	if errorFromFindById != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Author not found",
		})
	}
	err = authorService.DeleteAuthor(authorId, userId)
	if err != nil {
		log.Error(err)
		return err
	}
	return c.SendStatus(204)
}

// CreateAuthor godoc
// @Summary  Create an author
// @Tags     authors
// @Accept   json
// @Produce  json
// @Param    body  body  dto.AuthorCreateDto  true  "New author payload"
// @Success  200   {object}  dto.Author
// @Router   /v1/authors [post]
func CreateAuthor(c fiber.Ctx) error {
	var authorDto dto.AuthorCreateDto
	if err := c.Bind().Body(&authorDto); err != nil {
		return err
	}
	var authorService = GetLocal[service.AuthorService](c, constants.AuthorService)
	var userId = GetLocal[string](c, constants.UserId)

	var createdAuthor, err = authorService.CreateAuthor(authorDto, userId)
	if err != nil {
		// Surface duplicate-key violations as 409 so the frontend can show a
		// friendly "already exists" message; everything else is 500.
		status := 500
		if strings.Contains(err.Error(), "Duplicate entry") {
			status = 409
		}
		return c.Status(status).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.Status(200).JSON(mappers.ConvertAuthorDtoFromModel(createdAuthor))
}

// GetNotesOfAuthor godoc
// @Summary  List notes belonging to an author
// @Tags     authors
// @Produce  json
// @Param    authorId  path  string  true  "Author ID"
// @Success  200       {array}  models.Note
// @Router   /v1/authors/{authorId}/notes [get]
func GetNotesOfAuthor(c fiber.Ctx) error {
	var authorId = c.Params("authorId")
	var authorService = GetLocal[service.AuthorService](c, constants.AuthorService)
	var userId = GetLocal[string](c, constants.UserId)
	var authors, _ = authorService.FindAllNotesByAuthor(userId, authorId)
	return c.JSON(authors)
}
