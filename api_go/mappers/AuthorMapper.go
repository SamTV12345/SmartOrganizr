package mappers

import (
	"api_go/db"
	"api_go/models"
)

func ConvertAuthorFromEntity(entity db.Author) models.Author {
	a := models.Author{
		ID:               entity.ID,
		ExtraInformation: entity.ExtraInformation.String,
		Name:             entity.Name.String,
		WikidataID:       entity.WikidataID.String,
	}
	if entity.BirthYear.Valid {
		v := entity.BirthYear.Int16
		a.BirthYear = &v
	}
	if entity.DeathYear.Valid {
		v := entity.DeathYear.Int16
		a.DeathYear = &v
	}
	return a
}
