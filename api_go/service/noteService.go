package service

import (
	"api_go/controllers/dto"
	"api_go/db"
	"api_go/mappers"
	"api_go/models"
	"context"
	"database/sql"
	"errors"
	"github.com/google/uuid"
)

type NoteService struct {
	Queries       *db.Queries
	Ctx           context.Context
	UserService   *UserService
	AuthorService *AuthorService
}

func (n NoteService) LoadAllNotes(userId string) ([]models.Note, error) {
	notes, err := n.Queries.FindAllNotesByCreator(n.Ctx, sql.NullString{
		String: userId,
	})

	if err != nil {
		return nil, err
	}

	var creator *models.User
	var modelNotes = make([]models.Note, 0)

	for _, noteDB := range notes {
		if creator == nil {
			user, err := n.UserService.LoadUser(userId)
			if err != nil {
				return nil, err
			}
			creator = user
		}
		author, err := n.AuthorService.LoadAuthorById(noteDB.AuthorIDFk.String, userId)
		if err != nil {
			return nil, err
		}
		var note = db.ConvertNoteEntityToDBVersion(noteDB)
		modelNotes = append(modelNotes, mappers.ConvertNoteFromEntity(note, *creator, author))
	}

	return modelNotes, nil
}

func (n NoteService) LoadNote(noteId string, userId string) (models.Note, error) {
	noteDB, err := n.Queries.FindNoteById(n.Ctx, noteId)
	if err != nil {
		return models.Note{}, err
	}

	if noteDB.UserIDFk.String != userId {
		return models.Note{}, errors.New("not author of note")
	}

	creator, err := n.UserService.LoadUser(userId)
	if err != nil {
		return models.Note{}, err
	}

	author, err := n.AuthorService.LoadAuthorById(noteDB.AuthorIDFk.String, userId)

	if err != nil {
		return models.Note{}, err
	}
	var note = db.ConvertNoteEntityToDBVersion(noteDB)
	return mappers.ConvertNoteFromEntity(note, *creator, author), nil
}

func (n NoteService) DeleteNote(userId string, noteId string) error {
	var noteToDelete, err = n.Queries.FindNoteById(context.Background(), noteId)
	if err != nil {
		return err
	}
	if noteToDelete.UserIDFk.String != userId {
		return errors.New("not author of note")
	}

	err = n.Queries.DeleteNotesInConcertByNoteId(context.Background(), noteId)
	if err != nil {
		return err
	}

	err = n.Queries.DeleteNote(n.Ctx, db.DeleteNoteParams{
		ID: noteId,
		UserIDFk: sql.NullString{
			String: userId,
			Valid:  true,
		},
	})
	return err
}

func (n NoteService) CreateNote(userId string, note dto.NotePostDto) (*models.Note, error) {
	var noteId, _ = uuid.NewRandom()
	var _, err = n.Queries.CreateNote(n.Ctx, db.CreateNoteParams{
		ID:            noteId.String(),
		Title:         NewSQLNullString(note.Title),
		Description:   NewSQLNullString(note.Description),
		UserIDFk:      NewSQLNullString(userId),
		AuthorIDFk:    NewSQLNullString(note.AuthorId),
		Parent:        NewSQLNullString(note.ParentId),
		NumberOfPages: NewSQLNullInt(note.NumberOfPages),
	})
	if err != nil {
		return nil, err
	}
	noteModel, errLoading := n.LoadNote(noteId.String(), userId)
	if errLoading != nil {
		return nil, errLoading
	}
	return &noteModel, nil
}

func (n NoteService) UpdateNote(userId string, note models.Note) (models.Note, error) {
	var noteDB, err = n.LoadNote(note.Id, userId)
	if err != nil {
		return models.Note{}, err
	}

	if noteDB.Creator.UserId != userId {
		return models.Note{}, errors.New("not author of note")
	}

	err = n.Queries.UpdateNote(n.Ctx, db.UpdateNoteParams{
		ID:            note.Id,
		Title:         NewSQLNullString(note.Title),
		Description:   NewSQLNullString(note.Description),
		NumberOfPages: NewSQLNullInt(note.NumberOfPages),
		PdfContent:    NewSQLNullString(string(note.PDFContent)),
		Name:          NewSQLNullString(note.Name),
		AuthorIDFk:    NewSQLNullString(note.Author.ID),
	})

	if err != nil {
		return models.Note{}, err
	}
	return note, nil
}
