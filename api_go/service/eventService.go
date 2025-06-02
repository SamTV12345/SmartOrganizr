package service

import (
	"api_go/db"
	"api_go/mappers"
	"api_go/models"
	"context"
	"time"
)

type EventService struct {
	Queries *db.Queries
}

func (e *EventService) GetEventsOfUser(id string, since *time.Time) ([]models.Event, error) {
	dbEvents, err := e.Queries.GetEventsOfUser(context.Background(), db.GetEventsOfUserParams{
		UserIDFk:  id,
		StartDate: db.NewSQLNullTime(*since),
	})
	if err != nil {
		return nil, err
	}
	var modelsEvents = make([]models.Event, 0)
	for _, dbEvent := range dbEvents {
		eventModel := mappers.ConvertEventDBToModel(dbEvent)
		modelsEvents = append(modelsEvents, eventModel)
	}
	return modelsEvents, nil
}
