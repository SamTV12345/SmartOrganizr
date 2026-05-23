package mappers

import (
	"api_go/controllers/dto"
	"api_go/models"

	"github.com/gofiber/fiber/v3"
)

func ConvertFolderDtoFromModel(model models.Folder, c fiber.Ctx) dto.Folder {
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
		Type:         "folder",
		Parent:       parentFolder,
	}
}
