package mappers

import (
	"api_go/db"
	"api_go/models"
)

func ConvertFolderFromEntity(entity db.Folder, user db.User) models.Folder {
	var creator = ConvertUserFromEntity(user)

	return models.Folder{
		Name:         entity.GetName(),
		Id:           entity.GetId(),
		CreationDate: entity.GetCreationDate(),
		Creator:      creator,
		Description:  entity.GetDescription(),
		Elements:     make([]models.Element, 0),
	}
}
