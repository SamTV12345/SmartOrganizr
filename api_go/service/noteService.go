package service

import (
	"api_go/constants"
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

type NoteWithAuthor struct {
	Note   db.Element
	Author db.Author
	Folder db.Element
}

func (n NoteService) LoadAllNotes(userId string, page *int, nameStr *string) ([]models.Note, int, error) {

	var notes []NoteWithAuthor
	var numberOfElements int64
	if page == nil {
		if nameStr == nil {
			notesRetrieved, err := n.Queries.FindAllNotesByCreator(n.Ctx, NewSQLNullString(userId))
			if err != nil {
				return nil, 0, err
			}
			for _, note := range notesRetrieved {
				notes = append(notes, NoteWithAuthor{
					Note:   note.Element,
					Author: note.Author,
					Folder: note.Element_2,
				})
			}
			numberOfElements, err = n.Queries.CountFindAllNotesByCreator(n.Ctx, NewSQLNullString(userId))
			if err != nil {
				return nil, 0, err
			}
		} else {
			notesRetrieved, err := n.Queries.FindAllNotesByCreatorWithSearch(n.Ctx, db.FindAllNotesByCreatorWithSearchParams{
				UserIDFk: NewSQLNullString(userId),
				CONCAT:   NewSQLNullString(*nameStr),
			})
			if err != nil {
				return nil, 0, err
			}
			for _, note := range notesRetrieved {
				notes = append(notes, NoteWithAuthor{
					Note:   note.Element,
					Author: note.Author,
					Folder: note.Element_2,
				})
			}
			numberOfElements, err = n.Queries.CountFindAllNotesByCreatorWithSearch(n.Ctx, db.CountFindAllNotesByCreatorWithSearchParams{
				CONCAT:   NewSQLNullString(*nameStr),
				UserIDFk: NewSQLNullString(userId),
			})
			if err != nil {
				return nil, 0, err
			}
		}
	} else {
		if nameStr == nil {
			notesRetrieved, err := n.Queries.FindAllNotesByCreatorPaged(n.Ctx, db.FindAllNotesByCreatorPagedParams{
				UserIDFk: NewSQLNullString(userId),
				Limit:    constants.CurrentPageSize,
				Offset:   int32(*page * constants.CurrentPageSize),
			})
			if err != nil {
				return nil, 0, err
			}
			for _, note := range notesRetrieved {
				notes = append(notes, NoteWithAuthor{
					Note:   note.Element,
					Author: note.Author,
					Folder: note.Element_2,
				})
			}
			numberOfElements, err = n.Queries.CountFindAllNotesByCreator(n.Ctx, NewSQLNullString(userId))
			if err != nil {
				return nil, 0, err
			}
		} else {
			notesRetrieved, err := n.Queries.FindAllNotesByCreatorPagedWithSearch(n.Ctx, db.FindAllNotesByCreatorPagedWithSearchParams{
				UserIDFk: NewSQLNullString(userId),
				Limit:    constants.CurrentPageSize,
				Offset:   int32(*page * constants.CurrentPageSize),
				CONCAT:   nameStr,
			})
			if err != nil {
				return nil, 0, err
			}
			for _, note := range notesRetrieved {
				notes = append(notes, NoteWithAuthor{
					Note:   note.Element,
					Author: note.Author,
					Folder: note.Element_2,
				})
			}
			numberOfElements, err = n.Queries.CountFindAllNotesByCreatorWithSearch(n.Ctx, db.CountFindAllNotesByCreatorWithSearchParams{
				CONCAT:   NewSQLNullString(*nameStr),
				UserIDFk: NewSQLNullString(userId),
			})
			if err != nil {
				return nil, 0, err
			}
		}
	}

	var creator *models.User
	var modelNotes = make([]models.Note, 0)

	for _, noteDB := range notes {
		if creator == nil {
			user, err := n.UserService.LoadUser(userId)
			if err != nil {
				return nil, 0, err
			}
			creator = user
		}
		var note = db.ConvertNoteEntityToDBVersion(noteDB.Note)
		var folder = db.ConvertFolderEntityToDBVersion(noteDB.Folder)
		var author = mappers.ConvertAuthorFromEntity(noteDB.Author)
		modelNotes = append(modelNotes, mappers.ConvertNoteFromEntity(note, *creator, author, &folder))
	}

	return modelNotes, int(numberOfElements), nil
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
	return mappers.ConvertNoteFromEntity(note, *creator, author, nil), nil
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
