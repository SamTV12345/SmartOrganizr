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
