package service

import (
	"api_go/db"
	"api_go/mappers"
	"api_go/models"
	"context"
	"database/sql"
)

type AuthorService struct {
	Queries *db.Queries
	Ctx     context.Context
}

func (a *AuthorService) LoadAllAuthors(userId string) ([]models.Author, error) {
	authorsDB, err := a.Queries.FindAllAuthorsByCreatorUnpaged(a.Ctx, sql.NullString{
		String: userId,
	})
	var modelAuthors = make([]models.Author, 0)
	if err != nil {
		return nil, err
	}
	for _, author := range authorsDB {
		var authorModel = mappers.ConvertAuthorFromEntity(author)
		modelAuthors = append(modelAuthors, authorModel)
	}

	return modelAuthors, nil
}

func (a *AuthorService) LoadAuthorById(authorId int32, userId string) (models.Author, error) {
	authorDB, err := a.Queries.FindAuthorById(a.Ctx, db.FindAuthorByIdParams{
		ID: authorId,
		UserIDFk: sql.NullString{
			String: userId,
		},
	})
	if err != nil {
		return models.Author{}, err
	}
	var authorModel = mappers.ConvertAuthorFromEntity(authorDB)
	return authorModel, nil
}
