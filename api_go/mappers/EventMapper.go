package mappers

import (
	"api_go/controllers/dto"
	"api_go/db"
	"api_go/models"
	"strings"
)

func parseSummaryAndStatus(summaryAndStatus string) (summary string, status models.ConfirmStatus) {
	var trimmedSummaryAndStatus = strings.TrimSpace(summaryAndStatus)
	if strings.HasPrefix(trimmedSummaryAndStatus, "(-)") {
		return trimmedSummaryAndStatus[4:], models.Deny
	} else if strings.HasPrefix(trimmedSummaryAndStatus, "(+)") {
		return trimmedSummaryAndStatus[4:], models.Ok
	} else if strings.HasPrefix(trimmedSummaryAndStatus, "") {
		return trimmedSummaryAndStatus, models.Maybe
	} else {
		return trimmedSummaryAndStatus, models.NotYetDecided
	}
}

func ConvertEventDBToModel(eventDb db.Event) models.Event {
	summary, status := parseSummaryAndStatus(eventDb.Summary.String)
	return models.Event{
		Url:         eventDb.Url.String,
		GeoDateY:    db.ConvertSQLNullFloatToFloat(eventDb.GeoDateY),
		GeoDateX:    db.ConvertSQLNullFloatToFloat(eventDb.GeoDateX),
		Description: db.ConvertSQLNullString(eventDb.Description),
		Location:    db.ConvertSQLNullString(eventDb.Location),
		Summary:     summary,
		TzId:        db.ConvertSQLNullString(eventDb.TzID),
		UId:         eventDb.Uid,
		EndDate:     db.ConvertSQLNullTime(eventDb.EndDate),
		StartDate:   db.ConvertSQLNullTime(eventDb.StartDate),
		Status:      status,
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
		Status:      int(eventModel.Status),
	}
}
