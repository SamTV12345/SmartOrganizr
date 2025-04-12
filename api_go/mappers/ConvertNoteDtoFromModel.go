package mappers

import (
	"api_go/controllers/dto"
	"api_go/models"
	"github.com/gofiber/fiber/v2"
)

func ConvertNoteDtoFromModel(model *models.Note, c *fiber.Ctx) *dto.Note {
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
	return &dto.Note{
		Title:         model.Title,
		Id:            model.Id,
		CreationDate:  model.CreationDate,
		Creator:       user,
		Description:   model.Description,
		Name:          model.Name,
		Author:        author,
		PdfAvailable:  model.PdfAvailable,
		NumberOfPages: model.NumberOfPages,
		Type:          "note",
		Parent:        parent,
	}
}
