package mappers

import (
	"api_go/models"
	"github.com/gofiber/fiber/v2"
)

func ConvertElementDtoFromModel(model models.Element, c *fiber.Ctx) interface{} {
	switch model.Type() {
	case "NOTE":
		return ConvertNoteDtoFromModel(model.(models.Note))
	case "FOLDER":
		return ConvertFolderDtoFromModel(model.(models.Folder), c)
	}
	panic("Unknown model type: " + model.Type())
}
