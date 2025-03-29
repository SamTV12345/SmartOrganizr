package dto

import (
	"api_go/db"
)

type Author struct {
	ID               string `json:"id"`
	ExtraInformation string `json:"extraInformation"`
	Name             string `json:"name"`
}

type AuthorPatchDto struct {
	ExtraInformation string `json:"extraInformation"`
	Name             string `json:"name"`
}

func ConvertFromEntity(entity db.Author) Author {
	return Author{
		ID:               entity.ID,
		ExtraInformation: entity.ExtraInformation.String,
		Name:             entity.Name.String,
	}
}

func ConvertListOFEntities(entities []db.Author) []Author {
	var dtos = make([]Author, 0)
	for _, entity := range entities {
		dtos = append(dtos, ConvertFromEntity(entity))
	}
	return dtos
}
