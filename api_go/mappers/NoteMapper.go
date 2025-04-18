package mappers

import (
	"api_go/db"
	"api_go/models"
)

func ConvertNoteFromEntity(entity db.Note, user models.User, author models.Author, parent *db.Folder) models.Note {
	var parentFolder *models.Folder
	if parent != nil {
		parentFolderDto := ConvertFolderFromEntity(*parent, user)
		parentFolder = &parentFolderDto
	}
	return convertNote(entity, user, author, parentFolder)
}

func convertNote(entity db.Note, user models.User, author models.Author, parentFolder *models.Folder) models.Note {
	return models.Note{
		Id:            entity.GetId(),
		CreationDate:  entity.GetCreationDate(),
		Creator:       user,
		Description:   entity.GetDescription(),
		Name:          entity.GetName(),
		Author:        author,
		NumberOfPages: int(entity.NumberOfPages.Int32),
		PdfAvailable:  entity.PdfAvailable,
		PDFContent:    entity.PdfContent,
		Parent:        parentFolder,
	}
}

func ConvertNoteFromEntityWithFolderModel(entity db.Note, user models.User, author models.Author, parent *models.Folder) models.Note {
	return convertNote(entity, user, author, parent)
}
