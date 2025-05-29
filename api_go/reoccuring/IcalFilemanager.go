package reoccuring

import (
	"api_go/db"
	"api_go/service"
	"context"
	ics "github.com/arran4/golang-ical"
	"go.uber.org/zap"
	"strconv"
	"strings"
	"time"
)

func SyncAllICALFiles(queries *db.Queries, setupLogger *zap.SugaredLogger) {
	timeMinusOne := time.Now().Add(time.Duration(-1) * time.Minute)
	foundIcalFilestoSync, err := queries.FindIcalSyncWithUserSinceDate(context.Background(), service.NewSQLNullTime(timeMinusOne))

	if err != nil {
		setupLogger.Errorf("Error retrieving ical files to sync: %v", err)
	}

	for _, foundFileToSync := range foundIcalFilestoSync {
		urlToSync := foundFileToSync.IcalSync.IcalUrl
		cal, err := ics.ParseCalendarFromUrl(urlToSync)
		if err != nil {
			setupLogger.Errorf("Error syncing calendar for user %s with error %v", foundFileToSync.User.Username.String, err)
		}
		for _, event := range cal.Events() {
			summary := event.GetProperty("SUMMARY")
			url := event.GetProperty("URL")
			geoDate := event.GetProperty("GEO")
			locationProperty := event.GetProperty("LOCATION")
			uid := event.GetProperty("UID")
			tzId := event.GetProperty("TZID")
			description := event.GetProperty("DESCRIPTION")
			startDate, err := event.GetStartAt()

			if err != nil {
				setupLogger.Errorf("No start date found for event %s", summary)
			}

			endDate, err := event.GetEndAt()

			if err != nil {
				setupLogger.Errorf("No end date found for event %s", summary)
			}

			var geoDateX *float64
			var geoDateY *float64
			var location *string

			if locationProperty != nil {
				location = &locationProperty.Value
			}

			if geoDate != nil {
				geoDateX, geoDateY = splitGeoDates(geoDate.Value)
			}
			eventToCreate := db.Event{
				Uid:         uid.Value,
				UserIDFk:    foundFileToSync.User.ID,
				Summary:     service.NewSQLNullString(summary.Value),
				Url:         service.NewSQLNullString(url.Value),
				GeoDateX:    service.NewSQLNullFloatNullable(geoDateX),
				GeoDateY:    service.NewSQLNullFloatNullable(geoDateY),
				Location:    service.NewSQLNullStringNullValue(location),
				TzID:        service.NewSQLNullString(tzId.Value),
				Description: service.NewSQLNullString(description.Value),
				StartDate:   service.NewSQLNullTime(startDate),
				EndDate:     service.NewSQLNullTime(endDate),
			}
			err = queries.CreateEvent(context.Background(), db.CreateEventParams{
				GeoDateY:    eventToCreate.GeoDateY,
				GeoDateX:    eventToCreate.GeoDateX,
				Location:    eventToCreate.Location,
				Description: eventToCreate.Description,
				StartDate:   eventToCreate.StartDate,
				EndDate:     eventToCreate.EndDate,
				Summary:     eventToCreate.Summary,
				TzID:        eventToCreate.TzID,
				Url:         eventToCreate.Url,
				UserIDFk:    eventToCreate.UserIDFk,
				Uid:         eventToCreate.Uid,
			})

			if err != nil {
				setupLogger.Errorf("Error syncing calendar for user %s with error %v", foundFileToSync.User.Username.String, err)
			}
		}
		if err := queries.UpdateLastSyncOfIcal(context.Background(), db.UpdateLastSyncOfIcalParams{
			ID:         foundFileToSync.IcalSync.ID,
			LastSynced: service.NewSQLNullTime(time.Now()),
		}); err != nil {
			setupLogger.Errorf("Error updating last sync of ical file to sync: %v", err)
		}
	}
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
