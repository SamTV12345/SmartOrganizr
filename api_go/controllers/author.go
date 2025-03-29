package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/mappers"
	"api_go/service"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/log"
	"strconv"
)

// GetAuthors Gets the list of authors
// @Summary      Gets the list of authors
// @Description  Gets authors by page and name
// @Tags         authors
// @Accept       json
// @Produce      json
// @Param        page   query      int  true  "Page number"
// @Param        name   query      string  false  "Name of the author"
// @Success      200  {object}   dto.PagedAuthorRepresentationModelList
// @Failure      400  {object}  dto.Error
// @Failure      404  {object}  dto.Error
// @Failure      500  {object}  dto.Error
// @Security     OAuth2Application
// @Router       /accounts [get]
func GetAuthors(c *fiber.Ctx) error {
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
			Page: struct {
				Size int `json:"size"`
			}{Size: constants.CurrentPageSize},
			Embedded: struct {
				AuthorRepresentationModelList []dto.Author `json:"authorRepresentationModelList"`
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
			Page: struct {
				Size int `json:"size"`
			}{Size: constants.CurrentPageSize},
			Embedded: struct {
				AuthorRepresentationModelList []dto.Author `json:"authorRepresentationModelList"`
			}{AuthorRepresentationModelList: authorDto},
		}
	}

	if *count > (page+1)*constants.CurrentPageSize {
		authorPage.Links = make(map[string]dto.Link)
		authorPage.Links["next"] = dto.Link{
			Href: mappers.CreateHyperlink(c, "/api/v1/authors?page="+strconv.Itoa(page+1)+"&name="+nameStr),
		}
	}

	return c.JSON(authorPage)
}

// UpdateAuthor Updates an author
// @Summary      Updates an author
// @Tags         authors
// @Accept       json
// @Produce      json
// @Param        authorId   path      string  true  "Author ID"
// @RequestBody  {object}   dto.Author
// @Success      200  {object}   dto.Author
// @Failure      400  {object}  dto.Error
// @Failure      404  {object}  dto.Error
// @Failure      500  {object}  dto.Error
// @Security     OAuth2Application
// @Router       /{authorId} [patch]
func UpdateAuthor(c *fiber.Ctx) error {
	var authorService = GetLocal[service.AuthorService](c, constants.AuthorService)
	var userId = GetLocal[string](c, "userId")
	var authorId = c.Params("authorId")
	var authorPatchDto dto.AuthorPatchDto

	if err := c.BodyParser(&authorPatchDto); err != nil {
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

// DeleteAuthor  Deletes an author
// @Summary      Deletes an author
// @Description  Deletes an author by ID
// @Tags         authors
// @Accept       json
// @Produce      json
// @Param        page   query      int  true  "Page number"
// @Param        name   query      string  false  "Name of the author"
// @Success      200  {object}   dto.PagedAuthorRepresentationModelList
// @Failure      400  {object}  dto.Error
// @Failure      404  {object}  dto.Error
// @Failure      500  {object}  dto.Error
// @Security     OAuth2Application
// @Router       /accounts [get]
func DeleteAuthor(c *fiber.Ctx) error {
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

func CreateAuthor(c *fiber.Ctx) error {
	var authorDto dto.Author
	if err := c.BodyParser(&authorDto); err != nil {
		return err
	}
	var authorService = GetLocal[service.AuthorService](c, constants.AuthorService)
	var userId = GetLocal[string](c, constants.UserId)
	var createdAuthor, err = authorService.CreateAuthor(authorDto, userId)
	if err != nil {
		return c.JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.Status(201).JSON(mappers.ConvertAuthorDtoFromModel(createdAuthor))
}

func GetNotesOfAuthor(c *fiber.Ctx) error {
	var authorId = c.Params("authorId")
	var authorService = GetLocal[service.AuthorService](c, constants.AuthorService)
	var userId = GetLocal[string](c, constants.UserId)
	var authors, _ = authorService.FindAllNotesByAuthor(userId, authorId)
	return c.JSON(authors)
}
