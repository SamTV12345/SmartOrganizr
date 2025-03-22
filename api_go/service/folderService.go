package service

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/db"
	"api_go/mappers"
	"api_go/models"
	"context"
	"database/sql"
	"github.com/google/uuid"
)

type FolderService struct {
	Queries *db.Queries
	Ctx     context.Context
}

func (f *FolderService) loadSubElements(folder *models.Folder, user db.User) {
	var subElements, _ = f.Queries.FindAllSubElements(f.Ctx, db.FindAllSubElementsParams{
		UserIDFk: sql.NullString{
			String: user.ID,
			Valid:  true,
		},
		Parent: sql.NullString{
			String: folder.Id,
			Valid:  true,
		},
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

func (f *FolderService) FindFolderByIdAndUser(folderId string, userId string) (*models.Folder, error) {
	folderDB, err := f.Queries.FindFolderById(f.Ctx, db.FindFolderByIdParams{
		ID: folderId,
		UserIDFk: sql.NullString{
			String: userId,
			Valid:  true,
		},
	})
	if err != nil {
		return nil, err
	}
	var creator, _ = f.Queries.FindUserById(f.Ctx, userId)
	var folderModel = mappers.ConvertFolderFromEntity(folderDB, creator)
	f.loadSubElements(&folderModel, creator)
	return &folderModel, nil
}

func (f *FolderService) CreateFolder(dto dto.FolderPostDto, userId string) (*models.Folder, error) {
	var parent sql.NullString

	if dto.ParentId != nil {
		parent = sql.NullString{
			String: *dto.ParentId,
			Valid:  true,
		}
	} else {
		parent = sql.NullString{
			Valid: false,
		}
	}
	var folderId, _ = uuid.NewRandom()
	f.Queries.CreateFolder(context.Background(), db.CreateFolderParams{
		Name: sql.NullString{
			String: dto.Name,
			Valid:  true,
		},
		Description: sql.NullString{
			String: dto.Description,
			Valid:  true,
		},
		UserIDFk: sql.NullString{
			String: userId,
			Valid:  true,
		},
		Parent: parent,
		ID:     folderId.String(),
	})
	var createdFolder, err = f.FindFolderByIdAndUser(folderId.String(), userId)
	if err != nil {
		return nil, err
	}
	return createdFolder, nil
}

func (f *FolderService) FindNextChildren(folderId string, userId string) ([]models.Element, error) {
	var elements, _ = f.Queries.FindAllSubElements(f.Ctx, db.FindAllSubElementsParams{
		UserIDFk: sql.NullString{
			String: userId,
			Valid:  true,
		},
		Parent: sql.NullString{
			String: folderId,
			Valid:  true,
		},
	})
	var modelElements = make([]models.Element, 0)
	var creator, _ = f.Queries.FindUserById(f.Ctx, userId)
	for _, element := range elements {
		var modelElement = mappers.ConvertFromEntity(element, creator, nil)
		modelElements = append(modelElements, modelElement)
	}
	return modelElements, nil
}

func (f *FolderService) SearchFolders(userId string, page int, folderName string) ([]models.Folder, error) {
	var foldersDB, _ = f.Queries.SearchByFolderName(f.Ctx, db.SearchByFolderNameParams{
		UserIDFk: sql.NullString{
			String: userId,
			Valid:  true,
		},
		CONCAT: sql.NullString{
			String: folderName,
			Valid:  true,
		},
		Offset: int32(page * constants.CurrentPageSize),
		Limit:  constants.CurrentPageSize,
	})
	var modelFolders = make([]models.Folder, 0)
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

func (f *FolderService) CountFolders(userId string, folderName string) (int, error) {
	var count, _ = f.Queries.CountSearchByFolderName(f.Ctx, db.CountSearchByFolderNameParams{
		UserIDFk: sql.NullString{
			String: userId,
			Valid:  true,
		},
		CONCAT: sql.NullString{
			String: folderName,
			Valid:  true,
		},
	})
	return int(count), nil
}
