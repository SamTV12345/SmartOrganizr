package mappers

import (
	"api_go/controllers/dto"
	"api_go/models"
)

func ConvertNoteDtoFromModel(model models.Note) dto.Note {
	var user = ConvertUserDtoFromModel(model.Creator)
	var author = ConvertAuthorDtoFromModel(model.Author)
	return dto.Note{
		Title:         model.Title,
		Id:            model.Id,
		CreationDate:  model.CreationDate,
		Creator:       user,
		Description:   model.Description,
		Name:          model.Name,
		Author:        author,
		PdfAvailable:  model.PdfAvailable,
		NumberOfPages: model.NumberOfPages,
	}
}
