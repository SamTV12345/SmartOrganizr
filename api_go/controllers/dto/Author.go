package dto

import (
	"api_go/db"
)

type Author struct {
	ID               string `json:"id"               validate:"required"`
	ExtraInformation string `json:"extraInformation" validate:"required"`
	Name             string `json:"name"             validate:"required"`
	WikidataID       string `json:"wikidataId,omitempty"`
	BirthYear        *int16 `json:"birthYear,omitempty"`
	DeathYear        *int16 `json:"deathYear,omitempty"`
}

type AuthorPatchDto struct {
	ExtraInformation string `json:"extraInformation" validate:"required"`
	Name             string `json:"name"             validate:"required"`
	WikidataID       string `json:"wikidataId,omitempty"`
	BirthYear        *int16 `json:"birthYear,omitempty"`
	DeathYear        *int16 `json:"deathYear,omitempty"`
}

func ConvertFromEntity(entity db.Author) Author {
	a := Author{
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

func ConvertListOFEntities(entities []db.Author) []Author {
	var dtos = make([]Author, 0)
	for _, entity := range entities {
		dtos = append(dtos, ConvertFromEntity(entity))
	}
	return dtos
}
