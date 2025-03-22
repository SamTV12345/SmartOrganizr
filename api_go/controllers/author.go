package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/db"
	"api_go/mappers"
	"api_go/service"
	"context"
	"database/sql"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/log"
	"strconv"
)

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

func UpdateAuthor(c *fiber.Ctx) error {
	var authorId = c.Params("authorId")
	var query = GetLocal[*db.Queries](c, "db")
	var userId = GetLocal[string](c, "userId")
	var user, _ = query.FindUserById(context.Background(), userId)
	var author, errorFromFindById = query.FindAuthorById(context.Background(), db.FindAuthorByIdParams{
		UserIDFk: sql.NullString{
			String: user.ID,
		},
		ID: authorId,
	})
	if errorFromFindById != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Author not found",
		})
	}
	var authorPatchDto dto.Author

	if err := c.BodyParser(&authorPatchDto); err != nil {
		return err
	}

	err := query.UpdateAuthor(context.Background(), db.UpdateAuthorParams{
		ID: authorPatchDto.ID,
		ExtraInformation: sql.NullString{
			String: authorPatchDto.ExtraInformation,
			Valid:  true,
		},
		Name: sql.NullString{
			String: authorPatchDto.Name,
			Valid:  true,
		},
	})
	if err != nil {
		log.Error(err)
		return err
	}

	var authorDto = dto.ConvertFromEntity(author)
	return c.JSON(authorDto)
}

func DeleteAuthor(c *fiber.Ctx) error {
	var authorId = c.Params("authorId")
	var query = GetLocal[*db.Queries](c, "db")
	var userId = GetLocal[string](c, "userId")
	var user, _ = query.FindUserById(context.Background(), userId)
	var author, errorFromFindById = query.FindAuthorById(context.Background(), db.FindAuthorByIdParams{
		UserIDFk: sql.NullString{
			String: user.ID,
		},
		ID: authorId,
	})
	if errorFromFindById != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Author not found",
		})
	}
	err := query.DeleteAuthor(context.Background(), db.DeleteAuthorParams{
		ID: author.ID,
		UserIDFk: sql.NullString{
			String: user.ID,
			Valid:  true,
		},
	})
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
	var authorService = GetLocal[service.AuthorService](c, "db")
	var userId = GetLocal[string](c, "userId")
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
	var query = GetLocal[*db.Queries](c, "db")
	var userId = GetLocal[string](c, "userId")
	var authors, _ = query.FindAllNotesByAuthor(context.Background(), db.FindAllNotesByAuthorParams{
		UserIDFk: sql.NullString{
			String: userId,
		},
		AuthorIDFk: sql.NullString{
			String: authorId,
		},
	})
	return c.JSON(authors)
}
