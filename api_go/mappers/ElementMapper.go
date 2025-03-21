package mappers

import (
	"api_go/db"
	"api_go/models"
)

func ConvertFromEntity(entity db.IElement, user db.User, author *db.Author) models.Element {
	switch entity.GetType() {
	case "NOTE":
		return ConvertNoteFromEntity(entity.(db.Note), user, *author)
	case "FOLDER":
		return ConvertFolderFromEntity(entity.(db.Folder), user)
	}
	return nil
}
