package routers

import (
	"api_go/auth"
	"api_go/config"
	"api_go/controllers"
	"api_go/db"
	"api_go/service"
	"context"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/keyauth"
)

func SetupRouter(queries *db.Queries, config config.AppConfig) *fiber.App {
	validator, err := auth.NewKeycloakJWTValidator(config.SSO.Issuer, config.SSO.ClientID)
	if err != nil {
		panic(err)
	}

	app := fiber.New()

	app.Get("/api/public", controllers.GetIndex)

	profile := app.Group("api", keyauth.New(keyauth.Config{
		Validator: validator,
	}))

	profile.Route("v1/user", func(r fiber.Router) {
		r.Get("/sync", controllers.SyncUser)
		r.Get("/offline", controllers.GetOfflineData)
	})

	profile.Route("v1/authors", func(r fiber.Router) {
		r.Get("/", controllers.GetAuthors)
		r.Get("/:authorId/notes", controllers.GetNotes)
		r.Patch("/:authorId", controllers.UpdateAuthor)
		r.Delete("/:authorId", controllers.DeleteAuthor)
		r.Post("/", controllers.CreateAuthor)
	})
	var keycloakModel = controllers.KeycloakModel{
		ClientId: config.SSO.ClientID,
		Url:      config.SSO.Url,
	}

	var userService = service.UserService{
		Queries: queries,
		Ctx:     context.Background(),
	}

	var folderService = service.FolderService{
		Queries: queries,
	}

	var noteService = service.NoteService{
		Queries: queries,
	}

	app.Use(func(c *fiber.Ctx) error {
		SetLocal[service.UserService](c, "userService", userService)
		SetLocal[service.FolderService](c, "folderService", folderService)
		SetLocal[service.NoteService](c, "noteService", noteService)
		SetLocal[controllers.KeycloakModel](c, "keycloak", keycloakModel)
		// Go to next middleware:
		return c.Next()
	})
	return app
}

func SetLocal[T any](c *fiber.Ctx, key string, value T) {
	c.Locals(key, value)
}
