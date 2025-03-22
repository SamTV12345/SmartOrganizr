package mappers

import (
	"fmt"
	"github.com/gofiber/fiber/v2"
)

func CreateHyperlink(c *fiber.Ctx, subPath string) string {
	var uri = c.Request().URI()
	var formattedURL = fmt.Sprintf("%s://%s", uri.Scheme(), uri.Host())
	return formattedURL + subPath
}
