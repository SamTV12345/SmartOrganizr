package db

import (
	"database/sql"
	"strings"
)

func ConvertElementEntityToDBVersion(element Element) IElement {
	switch strings.ToUpper(element.Type) {
	case "NOTE":
		return ConvertNoteEntityToDBVersion(element)
	case "FOLDER":
		return ConvertFolderEntityToDBVersion(element)
	}
	panic("Unknown type!!" + element.Type)
}

func ConvertListElementEntityToDBVersion(elements []Element) []IElement {
	var result []IElement
	for _, element := range elements {
		result = append(result, ConvertElementEntityToDBVersion(element))
	}
	return result
}

func ConvertNoteEntityToDBVersion(element Element) Note {
	return Note{
		UserIDFk:      element.UserIDFk,
		Description:   element.Description,
		Parent:        element.Parent,
		Name:          element.Name,
		ID:            element.ID,
		AuthorIDFk:    element.AuthorIDFk,
		NumberOfPages: element.NumberOfPages,
		PdfAvailable:  element.PdfContent.Valid,
		CreationDate:  element.CreationDate,
		PdfContent:    sql.RawBytes(element.PdfContent.String),
	}
}

func ConvertFolderEntityToDBVersion(element Element) Folder {
	return Folder{
		UserIDFk:     element.UserIDFk,
		Description:  element.Description,
		Parent:       element.Parent,
		Name:         element.Name,
		ID:           element.ID,
		CreationDate: element.CreationDate,
	}
}
