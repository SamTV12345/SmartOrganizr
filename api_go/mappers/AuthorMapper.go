package mappers

import (
	"api_go/db"
	"api_go/models"
)

func ConvertAuthorFromEntity(entity db.Author) models.Author {
	return models.Author{
		ID:               entity.ID,
		ExtraInformation: entity.ExtraInformation.String,
		Name:             entity.Name.String,
	}
}
