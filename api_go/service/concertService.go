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

var ErrConcertNotFound = errors.New("concert not found")
var ErrNoteNotOwned = errors.New("note does not belong to user")

type ConcertService struct {
	Queries     *db.Queries
	Ctx         context.Context
	NoteService NoteService
}

func (c *ConcertService) LoadAllConcerts(userId string) ([]models.Concert, error) {
	concertsDB, err := c.Queries.FindConcertsOfUserSortedByDate(c.Ctx, db.NewSQLNullString(userId))
	if err != nil {
		return nil, err
	}
	var concertModel = make([]models.Concert, 0)
	for _, concert := range concertsDB {
		concertModel = append(concertModel, mappers.ConvertConcertFromEntity(concert, make([]models.NoteInConcert, 0)))
	}

	return concertModel, nil
}

func (c *ConcertService) LoadConcert(userId string, concertId string) (*models.Concert, error) {
	concertDB, err := c.findOwnedConcert(userId, concertId)
	if err != nil {
		return nil, err
	}

	var notesInConcert, _ = c.Queries.FindAllNotesInConcertByPlace(c.Ctx, concertId)
	var noteInConcertModels = make([]models.NoteInConcert, 0)
	for _, noteInConcert := range notesInConcert {
		note, err := c.NoteService.LoadNote(noteInConcert.NoteIDFk, userId)
		if err != nil {
			return nil, err
		}

		noteInConcertModels = append(noteInConcertModels, mappers.ConvertNoteInConcertFromEntity(noteInConcert, note))
	}

	var concertModel = mappers.ConvertConcertFromEntity(concertDB, noteInConcertModels)
	return &concertModel, nil
}

func (c *ConcertService) CreateConcert(userId string, dto dto.ConcertPostDto) (*models.Concert, error) {
	if err := c.validateNotesOwned(userId, dto.NoteIds); err != nil {
		return nil, err
	}
	var uuidForConcert, _ = uuid.NewUUID()
	_, err := c.Queries.CreateConcert(c.Ctx, db.CreateConcertParams{
		UserIDFk:    db.NewSQLNullString(userId),
		DueDate:     sql.NullTime{Time: dto.DueDate, Valid: true},
		Title:       db.NewSQLNullString(dto.Title),
		Description: db.NewSQLNullString(dto.Description),
		ID:          uuidForConcert.String(),
		Hints:       db.NewSQLNullString(dto.Hints),
		Location:    db.NewSQLNullString(dto.Location),
	})

	if err != nil {
		return nil, err
	}

	if err := c.replaceNotesInConcert(uuidForConcert.String(), dto.NoteIds); err != nil {
		return nil, err
	}

	return c.LoadConcert(userId, uuidForConcert.String())
}

// UpdateConcert overwrites the concert's fields and its complete ordered note
// program (replace semantics: the request carries the full list of note ids).
func (c *ConcertService) UpdateConcert(userId string, concertId string, dto dto.ConcertPostDto) (*models.Concert, error) {
	if _, err := c.findOwnedConcert(userId, concertId); err != nil {
		return nil, err
	}
	if err := c.validateNotesOwned(userId, dto.NoteIds); err != nil {
		return nil, err
	}

	err := c.Queries.UpdateConcert(c.Ctx, db.UpdateConcertParams{
		Title:       db.NewSQLNullString(dto.Title),
		Description: db.NewSQLNullString(dto.Description),
		Location:    db.NewSQLNullString(dto.Location),
		DueDate:     sql.NullTime{Time: dto.DueDate, Valid: true},
		Hints:       db.NewSQLNullString(dto.Hints),
		ID:          concertId,
		UserIDFk:    db.NewSQLNullString(userId),
	})
	if err != nil {
		return nil, err
	}

	if err := c.replaceNotesInConcert(concertId, dto.NoteIds); err != nil {
		return nil, err
	}

	return c.LoadConcert(userId, concertId)
}

func (c *ConcertService) DeleteConcert(userId string, concertId string) error {
	if _, err := c.findOwnedConcert(userId, concertId); err != nil {
		return err
	}

	if err := c.Queries.DeleteNotesInConcert(c.Ctx, concertId); err != nil {
		return err
	}

	return c.Queries.DeleteConcert(c.Ctx, concertId)
}

func (c *ConcertService) findOwnedConcert(userId string, concertId string) (db.Concert, error) {
	concert, err := c.Queries.FindConcertByIdAndUser(c.Ctx, db.FindConcertByIdAndUserParams{
		ID:       concertId,
		UserIDFk: db.NewSQLNullString(userId),
	})
	if err != nil {
		return db.Concert{}, ErrConcertNotFound
	}
	return concert, nil
}

func (c *ConcertService) validateNotesOwned(userId string, noteIds []string) error {
	for _, noteId := range noteIds {
		if _, err := c.NoteService.LoadNote(noteId, userId); err != nil {
			return ErrNoteNotOwned
		}
	}
	return nil
}

// replaceNotesInConcert rewrites the program as delete-all + reinsert: it
// trivially respects the unique(concert, place) constraint and keeps places
// contiguous. Duplicate ids are dropped, keeping the first occurrence.
// ponytail: no transaction — note ownership is validated beforehand, so a
// partial write only happens on infrastructure failure; wrap in WithTx if
// that ever matters.
func (c *ConcertService) replaceNotesInConcert(concertId string, noteIds []string) error {
	if err := c.Queries.DeleteNotesInConcert(c.Ctx, concertId); err != nil {
		return err
	}
	seen := make(map[string]bool, len(noteIds))
	place := int32(1)
	for _, noteId := range noteIds {
		if seen[noteId] {
			continue
		}
		seen[noteId] = true
		err := c.Queries.CreateNoteInConcert(c.Ctx, db.CreateNoteInConcertParams{
			ConcertIDFk:    concertId,
			NoteIDFk:       noteId,
			PlaceInConcert: sql.NullInt32{Int32: place, Valid: true},
		})
		if err != nil {
			return err
		}
		place++
	}
	return nil
}
