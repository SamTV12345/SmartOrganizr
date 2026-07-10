package mappers

import (
	"api_go/controllers/dto"
	"api_go/db"
	"api_go/models"

	"github.com/gofiber/fiber/v3"
)

func ConvertConcertFromEntity(entity db.Concert, notes []models.NoteInConcert) models.Concert {
	return models.Concert{
		Title:          entity.Title.String,
		Id:             entity.ID,
		NoteInConcerts: notes,
		Description:    entity.Description.String,
		Hints:          entity.Hints.String,
		Location:       entity.Location.String,
		DueDate:        entity.DueDate.Time,
	}
}

func ConvertConcertModelToDto(concert models.Concert, c fiber.Ctx) dto.ConcertDto {
	noteInConcerts := make([]dto.NoteInConcertDto, 0, len(concert.NoteInConcerts))
	for _, nic := range concert.NoteInConcerts {
		noteInConcerts = append(noteInConcerts, dto.NoteInConcertDto{
			NoteInConcert:  *ConvertNoteDtoFromModel(&nic.Note, c),
			PlaceInConcert: nic.Place,
		})
	}
	return dto.ConcertDto{
		Id:             concert.Id,
		Title:          concert.Title,
		Description:    concert.Description,
		Hints:          concert.Hints,
		Location:       concert.Location,
		DueDate:        concert.DueDate,
		NoteInConcerts: noteInConcerts,
	}
}
