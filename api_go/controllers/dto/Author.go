package dto

import (
	"api_go/db"
	"database/sql"
)

type Author struct {
	ID               int32          `json:"id"`
	ExtraInformation sql.NullString `json:"extraInformation"`
	Name             sql.NullString `json:"name"`
}

func ConvertFromEntity(entity db.Author) Author {
	return Author{
		ID:               entity.ID,
		ExtraInformation: entity.ExtraInformation,
		Name:             entity.Name,
	}
}

func ConvertListOFEntities(entities []db.Author) []Author {
	var dtos = make([]Author, 0)
	for _, entity := range entities {
		dtos = append(dtos, ConvertFromEntity(entity))
	}
	return dtos
}
