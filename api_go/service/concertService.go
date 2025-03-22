package service

import (
	"api_go/controllers/dto"
	"api_go/db"
	"api_go/mappers"
	"api_go/models"
	"context"
	"database/sql"
	"github.com/google/uuid"
)

type ConcertService struct {
	Queries *db.Queries
	Ctx     context.Context
}

func (c *ConcertService) LoadAllConcerts(userId string) ([]models.Concert, error) {
	concertsDB, err := c.Queries.FindConcertsOfUserSortedByDate(c.Ctx, sql.NullString{
		String: userId,
	})
	if err != nil {
		return nil, err
	}
	var concertModel = make([]models.Concert, 0)
	for _, concert := range concertsDB {
		concertModel = append(concertModel, mappers.ConvertConcertFromEntity(concert, make([]models.NoteInConcert, 0)))
	}

	return concertModel, nil
}

func (c *ConcertService) LoadNotesInConcert(concertId string) ([]models.NoteInConcert, error) {
	notesDB, err := c.Queries.FindAllNotesInConcertByPlace(c.Ctx, concertId)
	if err != nil {
		return nil, err
	}
	var notesModel = make([]models.NoteInConcert, 0)
	var creator *db.User
	for _, note := range notesDB {
		noteToFind, err := c.Queries.FindNoteById(c.Ctx, note.NoteIDFk)
		if err != nil {
			continue
		}
		if creator == nil {
			user, err := c.Queries.FindUserById(c.Ctx, noteToFind.UserIDFk.String)
			if err != nil {
				return nil, err
			}
			creator = &user
		}
		author, _ := c.Queries.FindAuthorById(c.Ctx, db.FindAuthorByIdParams{
			ID: noteToFind.AuthorIDFk.Int32,
			UserIDFk: sql.NullString{
				String: creator.UserID,
				Valid:  true,
			},
		})
		var noteInConcert = mappers.ConvertNoteInConcertFromEntity(note, *creator, author, noteToFind)
		notesModel = append(notesModel, noteInConcert)
	}

	return notesModel, nil
}

func (c *ConcertService) loadConcert(concertId string) (models.Concert, error) {
	concertDB, err := c.Queries.FindConcertById(c.Ctx, concertId)
	if err != nil {
		return models.Concert{}, err
	}

	var concertModel = mappers.ConvertConcertFromEntity(concertDB, make([]models.NoteInConcert, 0))
	return concertModel, nil
}

func (c *ConcertService) LoadConcert(userId string, concertId string) (*models.Concert, error) {
	concertDB, err := c.Queries.FindConcertByIdAndUser(c.Ctx, db.FindConcertByIdAndUserParams{
		ID: concertId,
		UserIDFk: sql.NullString{
			String: userId,
			Valid:  true,
		},
	})
	if err != nil {
		return nil, err
	}

	var notesInConcert, _ = c.Queries.FindAllNotesInConcertByPlace(c.Ctx, concertId)
	var noteInConcertModels = make([]models.NoteInConcert, 0)
	for _, noteInConcert := range notesInConcert {
		note, _ := c.Queries.FindNoteById(c.Ctx, noteInConcert.NoteIDFk)
		author, _ := c.Queries.FindAuthorById(c.Ctx, db.FindAuthorByIdParams{
			ID: note.AuthorIDFk.Int32,
			UserIDFk: sql.NullString{
				String: note.UserIDFk.String,
				Valid:  true,
			},
		})
		user, _ := c.Queries.FindUserById(c.Ctx, note.UserIDFk.String)
		var noteInConcertModel = mappers.ConvertNoteInConcertFromEntity(noteInConcert, user, author, note)
		noteInConcertModels = append(noteInConcertModels, noteInConcertModel)
	}

	var concertModel = mappers.ConvertConcertFromEntity(concertDB, noteInConcertModels)
	return &concertModel, nil
}

func (c *ConcertService) CreateConcert(userId string, dto dto.ConcertPostDto) (*models.Concert, error) {
	var uuidForConcert, _ = uuid.NewUUID()
	_, err := c.Queries.CreateConcert(c.Ctx, db.CreateConcertParams{
		UserIDFk: sql.NullString{
			String: userId,
			Valid:  true,
		},
		DueDate: sql.NullTime{
			Time:  dto.DueDate,
			Valid: true,
		},
		Title: sql.NullString{
			String: dto.Title,
			Valid:  true,
		},
		Description: sql.NullString{
			String: dto.Description,
			Valid:  true,
		},
		ID: uuidForConcert.String(),
		Hints: sql.NullString{
			String: dto.Hints,
			Valid:  true,
		},
		Location: sql.NullString{
			String: dto.Location,
			Valid:  true,
		},
	})

	if err != nil {
		return nil, err
	}
	concert, _ := c.Queries.FindConcertById(c.Ctx, uuidForConcert.String())

	var concertModel = mappers.ConvertConcertFromEntity(concert, make([]models.NoteInConcert, 0))
	return &concertModel, nil
}

func (c *ConcertService) DeleteConcert(userId string, concertId string) error {
	var _, err = c.Queries.FindConcertByIdAndUser(c.Ctx, db.FindConcertByIdAndUserParams{
		ID: concertId,
		UserIDFk: sql.NullString{
			String: userId,
		},
	})

	if err != nil {
		return err
	}

	err = c.Queries.DeleteNotesInConcert(c.Ctx, concertId)
	if err != nil {
		return err
	}

	err = c.Queries.DeleteConcert(c.Ctx, concertId)
	if err != nil {
		return err
	}
	return nil
}
