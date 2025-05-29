package service

import (
	"api_go/controllers/dto"
	"api_go/db"
	"api_go/mappers"
	"api_go/models"
	"context"
	"database/sql"
	"errors"
	"github.com/google/uuid"
	"net/http"
	"strings"
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
