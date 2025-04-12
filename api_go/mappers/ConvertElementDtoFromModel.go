package mappers

import (
	"api_go/models"
	"github.com/gofiber/fiber/v2"
)

func ConvertElementDtoFromModel(model models.Element, c *fiber.Ctx) interface{} {
	switch model.Type() {
	case "NOTE":
		{
			convertedNote := model.(models.Note)
			return ConvertNoteDtoFromModel(&convertedNote, c)

		}
	case "FOLDER":
		return ConvertFolderDtoFromModel(model.(models.Folder), c)
	}
	panic("Unknown model type: " + model.Type())
}
