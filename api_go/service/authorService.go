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
	Queries     *db.Queries
	Ctx         context.Context
	NoteService NoteService
	UserService UserService
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
		ID:       authorId,
		UserIDFk: NewSQLNullString(userId),
	})
	if err != nil {
		return models.Author{}, err
	}
	var authorModel = mappers.ConvertAuthorFromEntity(authorDB)
	return authorModel, nil
}

func (a *AuthorService) FindByCreatorAndSearchText(userId string, nameStr string) ([]models.Author, error) {
	var authorsDb, err = a.Queries.FindAllAuthorsByCreatorAndSearchText(context.Background(), db.FindAllAuthorsByCreatorAndSearchTextParams{
		UserIDFk: NewSQLNullString(userId),
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
		Limit:    constants.CurrentPageSize,
		Offset:   int32(constants.CurrentPageSize * page),
		UserIDFk: NewSQLNullString(userId),
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
			Valid:  true,
		},
		ID: authorId.String(),
	})
	var authorModel = mappers.ConvertAuthorFromEntity(authorSaved)
	return authorModel, nil
}

func (a *AuthorService) DeleteAuthor(authorId string, userId string) error {
	var notes, err = a.FindAllNotesByAuthor(userId, authorId)
	if err != nil {
		return nil
	}

	for _, note := range *notes {
		var err = a.NoteService.DeleteNote(userId, note.Id)
		if err != nil {
			return err
		}
	}

	err = a.Queries.DeleteAuthor(context.Background(), db.DeleteAuthorParams{
		ID: authorId,
		UserIDFk: sql.NullString{
			String: userId,
			Valid:  true,
		},
	})
	return err
}

func (a *AuthorService) FindAllNotesByAuthor(userId string, authorId string) (*[]models.Note, error) {
	var notes, err = a.Queries.FindAllNotesByAuthor(context.Background(), db.FindAllNotesByAuthorParams{
		UserIDFk:   NewSQLNullString(userId),
		AuthorIDFk: NewSQLNullString(authorId),
	})

	if err != nil {
		return nil, err
	}

	var user, errUserSearch = a.UserService.LoadUser(userId)
	if errUserSearch != nil {
		return nil, err
	}

	var author, errAuthorSearch = a.FindAuthorByIdAndUser(authorId, userId)

	if errAuthorSearch != nil {
		return nil, err
	}

	var modelAuthors = make([]models.Note, 0)
	for _, note := range notes {
		var convertedNote = db.ConvertNoteEntityToDBVersion(note)
		var noteModel = mappers.ConvertNoteFromEntity(convertedNote, *user, author, nil)
		modelAuthors = append(modelAuthors, noteModel)
	}
	return &modelAuthors, nil
}

func (a *AuthorService) FindAuthorByIdAndUser(authorId string, userId string) (models.Author, error) {
	var author, err = a.Queries.FindAuthorById(context.Background(), db.FindAuthorByIdParams{
		ID: authorId,
		UserIDFk: sql.NullString{
			String: userId,
			Valid:  true,
		},
	})
	if err != nil {
		return models.Author{}, err
	}
	var authorModel = mappers.ConvertAuthorFromEntity(author)
	return authorModel, nil
}

func (a *AuthorService) UpdateAuthor(authorPatchDto dto.Author, userId string) (models.Author, error) {
	err := a.Queries.UpdateAuthor(context.Background(), db.UpdateAuthorParams{
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
		return models.Author{}, err
	}
	var author, _ = a.Queries.FindAuthorById(context.Background(), db.FindAuthorByIdParams{
		ID: authorPatchDto.ID,
	})
	var authorModel = mappers.ConvertAuthorFromEntity(author)
	return authorModel, nil
}
