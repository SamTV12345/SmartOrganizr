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
			},
		})
		var noteInConcert = mappers.ConvertNoteInConcertFromEntity(note, *creator, author, noteToFind)
		notesModel = append(notesModel, noteInConcert)
	}

	return notesModel, nil
}

func (c *ConcertService) LoadConcert(concertId string) (models.Concert, error) {
	concertDB, err := c.Queries.FindConcertById(c.Ctx, concertId)
	if err != nil {
		return models.Concert{}, err
	}

	var concertModel = mappers.ConvertConcertFromEntity(concertDB, make([]models.NoteInConcert, 0))
	return concertModel, nil
}

func (c *ConcertService) CreateConcert(userId string, dto dto.ConcertPostDto) (*models.Concert, error) {
	var uuidForConcert, _ = uuid.NewUUID()
	_, err := c.Queries.CreateConcert(c.Ctx, db.CreateConcertParams{
		UserIDFk: sql.NullString{
			String: userId,
		},
		DueDate: sql.NullTime{
			Time: dto.DueDate,
		},
		Title: sql.NullString{
			String: dto.Title,
		},
		Description: sql.NullString{
			String: dto.Description,
		},
		ID: uuidForConcert.String(),
		Hints: sql.NullString{
			String: dto.Hints,
		},
		Location: sql.NullString{
			String: dto.Location,
		},
	})

	if err != nil {
		return nil, err
	}
	concert, _ := c.Queries.FindConcertById(c.Ctx, uuidForConcert.String())

	var concertModel = mappers.ConvertConcertFromEntity(concert, make([]models.NoteInConcert, 0))
	return &concertModel, nil
}
