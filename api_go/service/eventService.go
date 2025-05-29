package service

import (
	"api_go/db"
	"api_go/mappers"
	"api_go/models"
	"context"
)

type EventService struct {
	Queries *db.Queries
}

func (e *EventService) GetEventsOfUser(id string) ([]models.Event, error) {
	dbEvents, err := e.Queries.GetEventsOfUser(context.Background(), id)
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
