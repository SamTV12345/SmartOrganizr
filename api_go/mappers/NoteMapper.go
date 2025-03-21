package mappers

import (
	"api_go/db"
	"api_go/models"
)

func ConvertNoteFromEntity(entity db.Note, user db.User, author db.Author) models.Note {
	var creator = ConvertUserFromEntity(user)
	var authorModel = ConvertAuthorFromEntity(author)

	return models.Note{
		Title:        entity.GetTitle(),
		Id:           entity.GetId(),
		CreationDate: entity.GetCreationDate(),
		Creator:      creator,
		Description:  entity.GetDescription(),
		Name:         entity.GetName(),
		Author:       authorModel,
	}
}
