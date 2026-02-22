package service

import (
	"api_go/controllers/dto"
	"api_go/db"
	"api_go/mappers"
	"api_go/models"
	"context"
	"database/sql"
	"errors"
	ics "github.com/arran4/golang-ical"
	"github.com/google/uuid"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type IcalSyncService struct {
	Queries *db.Queries
}

func (i *IcalSyncService) ValidateIcalOnline(icalUrl string) (bool, error) {
	createdRequest, err := http.NewRequest("HEAD", icalUrl, nil)
	if err != nil {
		return false, err
	}
	client := &http.Client{}
	response, err := client.Do(createdRequest)
	if err != nil {
		return false, err
	}
	defer response.Body.Close()
	contentTypeHeader := response.Header.Get("Content-Type")
	return strings.Contains(contentTypeHeader, "text/calendar"), nil
}

func (i *IcalSyncService) saveIcalSync(icalSync models.IcalSyncModel, typeOfIcal string) (*models.IcalSyncModel, error) {
	var uuidForIcal, _ = uuid.NewRandom()
	if _, err := i.Queries.CreateIcalSync(context.Background(), db.CreateIcalSyncParams{
		ID:       uuidForIcal.String(),
		IcalUrl:  icalSync.Url,
		UserIDFk: icalSync.UserID,
		Type:     typeOfIcal,
	}); err != nil {
		return nil, err
	}

	icalSyncDb, err := i.Queries.FindIcalSyncById(context.Background(), db.FindIcalSyncByIdParams{
		ID:       uuidForIcal.String(),
		UserIDFk: icalSync.UserID,
	})

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("ical sync not found after creation")
		}
		return nil, err
	}

	mappedModel := mappers.ConvertIcalSyncFromDB(icalSyncDb)

	return &mappedModel, nil
}

func (i *IcalSyncService) SetIcalSync(icalSync dto.IcalSyncDto, typeOfIcal string, userid string) (*models.IcalSyncModel, error) {
	icalSyncModelToSave := mappers.ConvertIcalSyncFromDtoToModel(icalSync, userid)
	icalSyncModelOld, err := i.Queries.FindIcalSyncByTypeAndUser(context.Background(), db.FindIcalSyncByTypeAndUserParams{
		UserIDFk: userid,
		Type:     typeOfIcal,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return i.saveIcalSync(icalSyncModelToSave, typeOfIcal)
		}
		return nil, err
	}

	icalSyncModelToSave.Id = icalSyncModelOld.ID
	return i.updateIcalSync(icalSyncModelToSave)
}

func (i *IcalSyncService) updateIcalSync(icalSync models.IcalSyncModel) (*models.IcalSyncModel, error) {
	if err := i.Queries.UpdateIcalSync(context.Background(), db.UpdateIcalSyncParams{
		ID:       icalSync.Id,
		IcalUrl:  icalSync.Url,
		UserIDFk: icalSync.UserID,
	}); err != nil {
		return nil, err
	}
	icalDto, _ := i.Queries.FindIcalSyncById(context.Background(), db.FindIcalSyncByIdParams{
		ID:       icalSync.Id,
		UserIDFk: icalSync.UserID,
	})
	icalModel := mappers.ConvertIcalSyncFromDB(icalDto)
	return &icalModel, nil
}

func (i *IcalSyncService) GetIcalSync(typeOfIcal string, userid string) (*models.IcalSyncModel, error) {
	icalSyncDb, err := i.Queries.FindIcalSyncByTypeAndUser(context.Background(), db.FindIcalSyncByTypeAndUserParams{
		UserIDFk: userid,
		Type:     typeOfIcal,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil // No sync found
		}
		return nil, err // Other error
	}

	var icalSyncModel = mappers.ConvertIcalSyncFromDB(icalSyncDb)
	return &icalSyncModel, nil
}

func (i *IcalSyncService) SyncIcalByType(typeOfIcal string, userID string) (int, error) {
	icalSyncModel, err := i.GetIcalSync(typeOfIcal, userID)
	if err != nil {
		return 0, err
	}
	if icalSyncModel == nil || strings.TrimSpace(icalSyncModel.Url) == "" {
		return 0, errors.New("ical sync url not found")
	}

	cal, err := ics.ParseCalendarFromUrl(icalSyncModel.Url)
	if err != nil {
		return 0, err
	}

	syncedCount := 0
	for _, event := range cal.Events() {
		uid := getEventPropertyValue(event, "UID")
		if strings.TrimSpace(uid) == "" {
			continue
		}

		startDate, errStart := event.GetStartAt()
		endDate, errEnd := event.GetEndAt()
		if errStart != nil || errEnd != nil {
			continue
		}

		geoDateX, geoDateY := splitGeoDates(getEventPropertyValue(event, "GEO"))
		err = i.Queries.CreateEvent(context.Background(), db.CreateEventParams{
			Uid:         uid,
			UserIDFk:    userID,
			Summary:     db.NewSQLNullString(getEventPropertyValue(event, "SUMMARY")),
			Url:         db.NewSQLNullString(getEventPropertyValue(event, "URL")),
			GeoDateX:    db.NewSQLNullFloatNullable(geoDateX),
			GeoDateY:    db.NewSQLNullFloatNullable(geoDateY),
			Location:    db.NewSQLNullStringNullValue(nilIfEmpty(getEventPropertyValue(event, "LOCATION"))),
			TzID:        db.NewSQLNullString(getEventPropertyValue(event, "TZID")),
			Description: db.NewSQLNullString(getEventPropertyValue(event, "DESCRIPTION")),
			StartDate:   db.NewSQLNullTime(startDate),
			EndDate:     db.NewSQLNullTime(endDate),
		})
		if err != nil {
			return syncedCount, err
		}
		syncedCount++
	}

	if err := i.Queries.UpdateLastSyncOfIcal(context.Background(), db.UpdateLastSyncOfIcalParams{
		ID:         icalSyncModel.Id,
		LastSynced: db.NewSQLNullTime(time.Now()),
	}); err != nil {
		return syncedCount, err
	}

	return syncedCount, nil
}

func getEventPropertyValue(event *ics.VEvent, key string) string {
	prop := event.GetProperty(ics.ComponentProperty(key))
	if prop == nil {
		return ""
	}
	return strings.TrimSpace(prop.Value)
}

func nilIfEmpty(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func splitGeoDates(geoDate string) (*float64, *float64) {
	if strings.TrimSpace(geoDate) == "" {
		return nil, nil
	}
	splitted := strings.Split(geoDate, ";")
	if len(splitted) != 2 {
		return nil, nil
	}
	convertedXCord, err := strconv.ParseFloat(splitted[0], 64)
	if err != nil {
		return nil, nil
	}
	convertedYCord, err := strconv.ParseFloat(splitted[1], 64)
	if err != nil {
		return nil, nil
	}

	return &convertedXCord, &convertedYCord
}
