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
	Queries       *db.Queries
	Ctx           context.Context
	NoteService   NoteService
	AuthorService AuthorService
	UserService   UserService
}

func (f *FolderService) loadSubElements(folder *models.Folder, user models.User) {
	var subElements, _ = f.Queries.FindAllSubElements(f.Ctx, db.FindAllSubElementsParams{
		UserIDFk: sql.NullString{
			String: user.UserId,
			Valid:  true,
		},
		Parent: sql.NullString{
			String: folder.Id,
			Valid:  true,
		},
	})
	for _, element := range subElements {
		var ielement = db.ConvertElementEntityToDBVersion(element.Element)
		var author *models.Author = nil
		if _, ok := ielement.(db.Note); ok {
			var dbAuthor = mappers.ConvertAuthorFromEntity(db.Author{
				UserIDFk:         NewSQLNullString(element.UserIDFk.String),
				Name:             NewSQLNullString(element.Name.String),
				ID:               element.ID.String,
				ExtraInformation: NewSQLNullString(element.ExtraInformation.String),
			})
			author = &dbAuthor
		}
		var elementToAppend = mappers.ConvertFromEntity(ielement, user, author)
		folder.Elements = append(folder.Elements, elementToAppend)
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
	var creator *models.User
	for _, folder := range foldersDB {
		if creator == nil {
			user, err := f.UserService.LoadUser(userId)
			if err != nil {
				return nil, err
			}
			creator = user
		}
		var folderDb = db.ConvertFolderEntityToDBVersion(folder)
		var folderModel = mappers.ConvertFolderFromEntity(folderDb, *creator)
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
	var creator *models.User
	for _, folder := range foldersDB {
		if creator == nil {
			user, err := f.UserService.LoadUser(userId)
			if err != nil {
				return nil, err
			}
			creator = user
		}
		var folderDb = db.ConvertFolderEntityToDBVersion(folder)
		var folderModel = mappers.ConvertFolderFromEntity(folderDb, *creator)
		f.loadSubElements(&folderModel, *creator)
		modelFolders = append(modelFolders, folderModel)
	}

	return modelFolders, nil
}

func (f *FolderService) FindFolderByIdAndUser(folderId string, userId string) (*models.Folder, error) {
	folder, err := f.Queries.FindFolderById(f.Ctx, db.FindFolderByIdParams{
		ID:       folderId,
		UserIDFk: NewSQLNullString(userId),
	})
	if err != nil {
		return nil, err
	}
	var creator, errWhenLoading = f.UserService.LoadUser(userId)
	if errWhenLoading != nil {
		return nil, err
	}
	var folderDb = db.ConvertFolderEntityToDBVersion(folder)
	var folderModel = mappers.ConvertFolderFromEntity(folderDb, *creator)
	f.loadSubElements(&folderModel, *creator)
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
	var folderId, errRandom = uuid.NewRandom()
	if errRandom != nil {
		return nil, errRandom
	}
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
	if dto.ParentId != nil {
		var parentFolder, errParent = f.FindFolderByIdAndUser(*dto.ParentId, userId)
		if errParent != nil {
			return nil, errParent
		}
		createdFolder.Parent = parentFolder
	}
	if err != nil {
		return nil, err
	}
	return createdFolder, nil
}

func (f *FolderService) FindNextChildren(folderId string, userId string) ([]models.Element, error) {
	var elements, errFromSub = f.Queries.FindAllSubElements(f.Ctx, db.FindAllSubElementsParams{
		UserIDFk: NewSQLNullString(userId),
		Parent:   NewSQLNullString(folderId),
	})

	if errFromSub != nil {
		return nil, errFromSub
	}

	var modelElements = make([]models.Element, 0)
	var creator, err = f.UserService.LoadUser(userId)
	if err != nil {
		return nil, err
	}
	for _, element := range elements {
		var convertedElement = db.ConvertElementEntityToDBVersion(element.Element)
		var author *models.Author
		if _, ok := convertedElement.(db.Note); ok {
			var authorMapped = mappers.ConvertAuthorFromEntity(db.Author{
				UserIDFk:         NewSQLNullString(element.UserIDFk.String),
				Name:             NewSQLNullString(element.Name.String),
				ID:               element.ID.String,
				ExtraInformation: NewSQLNullString(element.ExtraInformation.String),
			})
			author = &authorMapped
		}
		var modelElement = mappers.ConvertFromEntity(convertedElement, *creator, author)
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
	var creator *models.User
	for _, folder := range foldersDB {
		if creator == nil {
			user, err := f.UserService.LoadUser(userId)
			if err != nil {
				return nil, err
			}
			creator = user
		}
		var convertedModel = db.ConvertFolderEntityToDBVersion(folder)
		var folderModel = mappers.ConvertFolderFromEntity(convertedModel, *creator)
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
