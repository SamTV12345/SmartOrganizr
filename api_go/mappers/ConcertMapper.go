package mappers

import (
	"api_go/db"
	"api_go/models"
)

func ConvertConcertFromEntity(entity db.Concert, notes []models.NoteInConcert) models.Concert {

	return models.Concert{
		Title:          entity.Title.String,
		Id:             entity.ID,
		NoteInConcerts: notes,
		Description:    entity.Description.String,
		DueDate:        entity.DueDate.Time,
	}
}
