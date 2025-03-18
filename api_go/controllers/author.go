package controllers

import (
	"api_go/controllers/dto"
	"api_go/db"
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
	var query = GetLocal[*db.Queries](c, "db")
	var userId = GetLocal[string](c, "userId")

	var user, _ = query.FindUserById(context.Background(), userId)
	var authors []db.Author

	if nameStr != "" {
		authors, _ = query.FindAllAuthorsByCreatorAndSearchText(context.Background(), db.FindAllAuthorsByCreatorAndSearchTextParams{
			UserID:   userId,
			CONCAT:   nameStr,
			CONCAT_2: nameStr,
		})
	} else {
		authors, _ = query.FindAllByCreator(context.Background(), db.FindAllByCreatorParams{
			Limit:  50,
			Offset: int32(50 * (page - 1)),
			UserIDFk: sql.NullString{
				String: user.UserID,
			},
		})
	}

	var authorDtos = dto.ConvertListOFEntities(authors)

	return c.JSON(authorDtos)
}

func UpdateAuthor(c *fiber.Ctx) error {
	var authorId, err = strconv.Atoi(c.Params("authorId"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid authorId",
		})
	}
	var query = GetLocal[*db.Queries](c, "db")
	var userId = GetLocal[string](c, "userId")
	var user, _ = query.FindUserById(context.Background(), userId)
	var author, errorFromFindById = query.FindAuthorById(context.Background(), db.FindAuthorByIdParams{
		UserIDFk: sql.NullString{
			String: user.UserID,
		},
		ID: int32(authorId),
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

	err = query.UpdateAuthor(context.Background(), db.UpdateAuthorParams{
		ID:               authorPatchDto.ID,
		ExtraInformation: authorPatchDto.ExtraInformation,
		Name:             authorPatchDto.Name,
	})
	if err != nil {
		log.Error(err)
		return err
	}

	var authorDto = dto.ConvertFromEntity(author)
	return c.JSON(authorDto)
}

func DeleteAuthor(c *fiber.Ctx) error {
	var authorId, err = strconv.Atoi(c.Params("authorId"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid authorId",
		})
	}
	var query = GetLocal[*db.Queries](c, "db")
	var userId = GetLocal[string](c, "userId")
	var user, _ = query.FindUserById(context.Background(), userId)
	var author, errorFromFindById = query.FindAuthorById(context.Background(), db.FindAuthorByIdParams{
		UserIDFk: sql.NullString{
			String: user.UserID,
		},
		ID: int32(authorId),
	})
	if errorFromFindById != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Author not found",
		})
	}
	err = query.DeleteAuthor(context.Background(), db.DeleteAuthorParams{
		ID: author.ID,
		UserIDFk: sql.NullString{
			String: user.UserID,
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
	var query = GetLocal[*db.Queries](c, "db")
	var userId = GetLocal[string](c, "userId")
	var user, _ = query.FindUserById(context.Background(), userId)
	var result, err = query.CreateAuthor(context.Background(), db.CreateAuthorParams{
		Name:             authorDto.Name,
		ExtraInformation: authorDto.ExtraInformation,
		UserIDFk: sql.NullString{
			String: user.UserID,
		},
	})

	if err != nil {
		log.Error(err)
		return err
	}
	var author, _ = query.FindAuthorById(context.Background(), db.FindAuthorByIdParams{
		UserIDFk: sql.NullString{
			String: user.UserID,
		},
		ID: int32(result),
	})
	return c.Status(201).JSON(dto.ConvertFromEntity(author))
}

func GetNotes(c *fiber.Ctx) error {
	var authorId, err = strconv.Atoi(c.Params("authorId"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid authorId",
		})
	}
	var query = GetLocal[*db.Queries](c, "db")
	var userId = GetLocal[string](c, "userId")
	var authors, _ = query.FindAllNotesByAuthor(context.Background(), db.FindAllNotesByAuthorParams{
		UserIDFk: sql.NullString{
			String: userId,
		},
		AuthorIDFk: sql.NullInt32{
			Int32: int32(authorId),
		},
	})
	return c.JSON(authors)
}
