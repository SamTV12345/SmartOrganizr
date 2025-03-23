package mappers

import (
	"api_go/db"
	"api_go/models"
)

func ConvertFolderFromEntity(entity db.Folder, user models.User) models.Folder {

	return models.Folder{
		Name:         entity.GetName(),
		Id:           entity.GetId(),
		CreationDate: entity.GetCreationDate(),
		Creator:      user,
		Description:  entity.GetDescription(),
		Elements:     make([]models.Element, 0),
	}
}
