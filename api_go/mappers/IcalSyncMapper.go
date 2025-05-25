package mappers

import (
	"api_go/controllers/dto"
	"api_go/db"
	"api_go/models"
)

func ConvertIcalSyncFromDB(dto db.IcalSync) models.IcalSyncModel {
	return models.IcalSyncModel{
		Id:     dto.ID,
		Url:    dto.IcalUrl,
		UserID: dto.UserIDFk,
	}
}

func ConvertIcalSyncFromDtoToModel(dto dto.IcalSyncDto, userId string) models.IcalSyncModel {
	return models.IcalSyncModel{
		Id:     dto.Id,
		Url:    dto.Url,
		UserID: userId,
	}
}

func ConvertIcalSyncFromModelToDto(model models.IcalSyncModel) dto.IcalSyncDto {
	return dto.IcalSyncDto{
		Id:  model.Id,
		Url: model.Url,
	}
}
