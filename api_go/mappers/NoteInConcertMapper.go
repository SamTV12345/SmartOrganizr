package mappers

import (
	"api_go/db"
	"api_go/models"
)

func ConvertNoteInConcertFromEntity(entity db.NoteInConcert, user db.User, author db.Author, noteEntity db.Note) models.NoteInConcert {
	var note = ConvertNoteFromEntity(noteEntity, user, author)
	var noteInConcert = models.NoteInConcert{
		Note:  note,
		Place: entity.PlaceInConcert.Int32,
	}
	return noteInConcert
}
