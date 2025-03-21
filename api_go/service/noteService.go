package service

import (
	"api_go/db"
	"api_go/mappers"
	"api_go/models"
	"context"
	"database/sql"
)

type NoteService struct {
	Queries *db.Queries
	Ctx     context.Context
}

func (n NoteService) LoadAllNotes(userId string) ([]models.Note, error) {
	notes, err := n.Queries.FindAllNotesByCreator(n.Ctx, sql.NullString{
		String: userId,
	})

	if err != nil {
		return nil, err
	}

	var creator *db.User
	var modelNotes = make([]models.Note, 0)

	for _, noteDB := range notes {
		if creator == nil {
			user, err := n.Queries.FindUserById(n.Ctx, noteDB.UserIDFk.String)
			if err != nil {
				return nil, err
			}
			creator = &user
		}
		author, err := n.Queries.FindAuthorById(n.Ctx, db.FindAuthorByIdParams{
			ID: noteDB.AuthorIDFk.Int32,
			UserIDFk: sql.NullString{
				String: userId,
			},
		})
		if err != nil {
			return nil, err
		}
		modelNotes = append(modelNotes, mappers.ConvertNoteFromEntity(noteDB, *creator, author))
	}

	return modelNotes, nil
}
