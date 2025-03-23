package mappers

import (
	"api_go/controllers/dto"
	"api_go/models"
)

func ConvertNoteDtoFromModel(model models.Note) dto.Note {
	var user = ConvertUserDtoFromModel(model.Creator)
	return dto.Note{
		Title:        model.Title,
		Id:           model.Id,
		CreationDate: model.CreationDate,
		Creator:      user,
		Description:  model.Description,
		Name:         model.Name,
	}
}
