package mappers

import (
	"api_go/db"
	"api_go/models"
	"strings"
)

func ConvertFromEntity(entity db.IElement, user models.User, author *models.Author) models.Element {
	switch strings.ToUpper(entity.GetType()) {
	case "NOTE":
		return ConvertNoteFromEntity(entity.(db.Note), user, *author)
	case "FOLDER":
		return ConvertFolderFromEntity(entity.(db.Folder), user)
	}
	return nil
}

func ConvertFromFindAllSubElementsRow(element db.FindAllSubElementsRow) db.Element {
	return db.Element{
		Type:          element.Type,
		NumberOfPages: element.NumberOfPages,
		Parent:        element.Parent,
		Name:          element.Name,
		ID:            element.ID,
		AuthorIDFk:    element.AuthorIDFk,
		Title:         element.Title,
		CreationDate:  element.CreationDate,
		Description:   element.Description,
		PdfContent:    element.PdfContent,
		UserIDFk:      element.UserIDFk,
	}
}

func ConvertAuthorFromFindAllSubElementsRow(element db.FindAllSubElementsRow) db.Author {
	return db.Author{
		ID:               element.ID_2.String,
		ExtraInformation: element.ExtraInformation,
		Name:             element.Name_2,
		UserIDFk:         element.UserIDFk,
	}
}
