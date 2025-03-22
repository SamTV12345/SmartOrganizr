package service

import (
	"api_go/db"
	"api_go/mappers"
	"api_go/models"
	"context"
	"database/sql"
)

type FolderService struct {
	Queries *db.Queries
	Ctx     context.Context
}

func (f *FolderService) loadSubElements(folder *models.Folder, user db.User) {
	var subElements, _ = f.Queries.FindAllSubElements(f.Ctx, sql.NullInt32{
		Int32: folder.Id,
	})
	for _, element := range subElements {
		mappers.ConvertFromEntity(element, user, nil)
		folder.Elements = append(folder.Elements)
	}
}

func (f *FolderService) FindAllParentDeckFolders(userId string) ([]models.Folder, error) {
	foldersDB, err := f.Queries.FindAllParentFolders(f.Ctx, sql.NullString{
		String: userId,
		Valid:  true,
	})
	var modelFolders = make([]models.Folder, 0)
	if err != nil {
		return nil, err
	}
	var creator *db.User
	for _, folder := range foldersDB {
		if creator == nil {
			user, err := f.Queries.FindUserById(f.Ctx, userId)
			if err != nil {
				return nil, err
			}
			creator = &user
		}

		var folderModel = mappers.ConvertFolderFromEntity(folder, *creator)
		f.loadSubElements(&folderModel, *creator)
		modelFolders = append(modelFolders, folderModel)
	}

	return modelFolders, nil
}

func (f *FolderService) LoadAllFolders(userId string) ([]models.Folder, error) {
	foldersDB, err := f.Queries.FindAllFoldersByCreator(f.Ctx, sql.NullString{
		String: userId,
	})
	var modelFolders = make([]models.Folder, 0)
	if err != nil {
		return nil, err
	}
	var creator *db.User
	for _, folder := range foldersDB {
		if creator == nil {
			user, err := f.Queries.FindUserById(f.Ctx, folder.UserIDFk.String)
			if err != nil {
				return nil, err
			}
			creator = &user
		}

		var folderModel = mappers.ConvertFolderFromEntity(folder, *creator)
		f.loadSubElements(&folderModel, *creator)
		modelFolders = append(modelFolders, folderModel)
	}

	return modelFolders, nil
}
