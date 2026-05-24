package mappers

import (
	"api_go/controllers/dto"
	"api_go/models"
	"github.com/gofiber/fiber/v3"
)

func ConvertNoteDtoFromModel(model *models.Note, c fiber.Ctx) *dto.Note {
	if model == nil {
		return nil
	}

	var user = ConvertUserDtoFromModel(model.Creator, c)
	var author = ConvertAuthorDtoFromModel(model.Author)
	var parent *dto.Folder
	if model.Parent != nil {
		parentDto := ConvertFolderDtoFromModel(*model.Parent, nil)
		parent = &parentDto
	}
	var arranger *dto.Author
	if model.Arranger != nil {
		a := ConvertAuthorDtoFromModel(*model.Arranger)
		arranger = &a
	}
	return &dto.Note{
		Id:              model.Id,
		CreationDate:    model.CreationDate,
		Creator:         user,
		Description:     model.Description,
		Name:            model.Name,
		Author:          author,
		Arranger:        arranger,
		PdfAvailable:    model.PdfAvailable,
		NumberOfPages:   model.NumberOfPages,
		Type:            "note",
		Parent:          parent,
		WikidataID:      model.WikidataID,
		CompositionYear: model.CompositionYear,
		Genre:           model.Genre,
	}
}
