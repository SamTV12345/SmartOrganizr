package mappers

import (
	"api_go/db"
	"api_go/models"
)

func ConvertNoteInConcertFromEntity(entity db.NoteInConcert, noteModel models.Note) models.NoteInConcert {
	var noteInConcert = models.NoteInConcert{
		Note:  noteModel,
		Place: entity.PlaceInConcert.Int32,
	}
	return noteInConcert
}
