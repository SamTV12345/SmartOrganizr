package mappers

import (
	"api_go/controllers/dto"
	"api_go/models"

	"github.com/gofiber/fiber/v2"
)

func ConvertFolderDtoFromModel(model models.Folder, c *fiber.Ctx) dto.Folder {
	var links = make([]dto.Link, 0)
	if c != nil {
		links = append(links, dto.Link{
			Href: CreateHyperlink(c, "/api/v1/elements/"+model.Id+"/children"),
		})
	}
	var parentFolder *dto.Folder
	if model.Parent != nil {
		parentFolderAct := ConvertFolderDtoFromModel(*model.Parent, c)
		parentFolder = &parentFolderAct
	}

	return dto.Folder{
		Name:         model.Name,
		Id:           model.Id,
		CreationDate: model.CreationDate,
		Creator:      ConvertUserDtoFromModel(model.Creator, c),
		Description:  model.Description,
		Elements:     make([]models.Element, 0),
		Links:        links,
		Type:         "folder",
		Parent:       parentFolder,
	}
}
