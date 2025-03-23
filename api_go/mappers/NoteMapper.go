package mappers

import (
	"api_go/db"
	"api_go/models"
)

func ConvertNoteFromEntity(entity db.Note, user models.User, author models.Author) models.Note {

	return models.Note{
		Title:         entity.Title.String,
		Id:            entity.GetId(),
		CreationDate:  entity.GetCreationDate(),
		Creator:       user,
		Description:   entity.GetDescription(),
		Name:          entity.GetName(),
		Author:        author,
		NumberOfPages: int(entity.NumberOfPages.Int32),
		PdfAvailable:  entity.PdfAvailable,
	}
}
