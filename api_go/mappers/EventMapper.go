package mappers

import (
	"api_go/controllers/dto"
	"api_go/db"
	"api_go/models"
)

func ConvertEventDBToModel(eventDb db.Event) models.Event {
	return models.Event{
		Url:         eventDb.Url.String,
		GeoDateY:    db.ConvertSQLNullFloatToFloat(eventDb.GeoDateY),
		GeoDateX:    db.ConvertSQLNullFloatToFloat(eventDb.GeoDateX),
		Description: db.ConvertSQLNullString(eventDb.Description),
		Location:    db.ConvertSQLNullString(eventDb.Location),
		Summary:     *db.ConvertSQLNullString(eventDb.Summary),
		TzId:        db.ConvertSQLNullString(eventDb.TzID),
		UId:         eventDb.Uid,
		EndDate:     db.ConvertSQLNullTime(eventDb.EndDate),
		StartDate:   db.ConvertSQLNullTime(eventDb.StartDate),
	}
}

func ConvertEventModelToDto(eventModel models.Event) dto.Event {
	return dto.Event{
		UId:         eventModel.UId,
		Url:         eventModel.Url,
		Summary:     eventModel.Summary,
		StartDate:   eventModel.StartDate,
		TzId:        eventModel.TzId,
		EndDate:     eventModel.EndDate,
		Location:    eventModel.Location,
		Description: eventModel.Description,
		GeoDateX:    eventModel.GeoDateX,
		GeoDateY:    eventModel.GeoDateY,
	}
}
