package service

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/db"
	"api_go/mappers"
	"api_go/models"
	"context"
	"database/sql"
	"github.com/google/uuid"
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

func (a *AuthorService) LoadAuthorById(authorId string, userId string) (models.Author, error) {
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

func (a *AuthorService) FindByCreatorAndSearchText(userId string, nameStr string) ([]models.Author, error) {
	var authorsDb, err = a.Queries.FindAllAuthorsByCreatorAndSearchText(context.Background(), db.FindAllAuthorsByCreatorAndSearchTextParams{
		UserIDFk: sql.NullString{
			String: userId,
		},
		CONCAT:   nameStr,
		CONCAT_2: nameStr,
	})
	if err != nil {
		return nil, err
	}

	var modelAuthors = make([]models.Author, 0)
	for _, author := range authorsDb {
		var authorModel = mappers.ConvertAuthorFromEntity(author)
		modelAuthors = append(modelAuthors, authorModel)
	}
	return modelAuthors, nil
}

func (a *AuthorService) CountFindByCreatorAndSearchText(userId string, nameStr string) (*int, error) {
	var authorCount, err = a.Queries.CountFindAllAuthorsByCreatorAndSearchText(context.Background(), db.CountFindAllAuthorsByCreatorAndSearchTextParams{
		UserIDFk: sql.NullString{
			String: userId,
		},
		CONCAT:   nameStr,
		CONCAT_2: nameStr,
	})
	if err != nil {
		return nil, err
	}

	var authorCountInt = int(authorCount)
	return &authorCountInt, nil
}

func (a *AuthorService) FindAllByCreator(userId string, page int) ([]models.Author, error) {
	var authorsDb, err = a.Queries.FindAllAuthorsByCreator(a.Ctx, db.FindAllAuthorsByCreatorParams{
		Limit:  constants.CurrentPageSize,
		Offset: int32(constants.CurrentPageSize * page),
		UserIDFk: sql.NullString{
			String: userId,
		},
	})
	if err != nil {
		return nil, err
	}

	var modelAuthors = make([]models.Author, 0)
	for _, author := range authorsDb {
		var authorModel = mappers.ConvertAuthorFromEntity(author)
		modelAuthors = append(modelAuthors, authorModel)
	}
	return modelAuthors, nil
}

func (a *AuthorService) CountFindAllByCreator(userId string) (*int, error) {
	var authorCount, err = a.Queries.CountFindAllAuthorsByCreator(a.Ctx, sql.NullString{
		String: userId,
		Valid:  true,
	})
	if err != nil {
		return nil, err
	}

	var authorCountInt = int(authorCount)
	return &authorCountInt, nil
}

func (a *AuthorService) CreateAuthor(author dto.Author, userId string) (models.Author, error) {
	var authorId, _ = uuid.NewRandom()
	var _, err = a.Queries.CreateAuthor(context.Background(), db.CreateAuthorParams{
		Name: sql.NullString{
			String: author.Name,
			Valid:  true,
		},
		ExtraInformation: sql.NullString{
			String: author.ExtraInformation,
			Valid:  true,
		},
		UserIDFk: sql.NullString{
			String: userId,
			Valid:  true,
		},
		ID: authorId.String(),
	})
	if err != nil {
		return models.Author{}, err
	}
	var authorSaved, _ = a.Queries.FindAuthorById(context.Background(), db.FindAuthorByIdParams{
		UserIDFk: sql.NullString{
			String: userId,
		},
		ID: authorId.String(),
	})
	var authorModel = mappers.ConvertAuthorFromEntity(authorSaved)
	return authorModel, nil
}
