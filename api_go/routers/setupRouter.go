package routers

import (
	"api_go/auth"
	"api_go/config"
	"api_go/controllers"
	"api_go/db"
	"api_go/service"
	"context"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/keyauth"
)

func SetupRouter(queries *db.Queries, config config.AppConfig) *fiber.App {
	validator, err := auth.NewKeycloakJWTValidator(config.SSO.Issuer, config.SSO.ClientID)
	if err != nil {
		panic(err)
	}

	app := fiber.New()

	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "*",
	}))

	var userService = service.UserService{
		Queries: queries,
		Ctx:     context.Background(),
	}

	var folderService = service.FolderService{
		Queries: queries,
		Ctx:     context.Background(),
	}

	var noteService = service.NoteService{
		Queries: queries,
		Ctx:     context.Background(),
	}

	app.Use(func(c *fiber.Ctx) error {
		SetLocal[service.UserService](c, "userService", userService)
		SetLocal[service.FolderService](c, "folderService", folderService)
		SetLocal[service.NoteService](c, "noteService", noteService)
		// Go to next middleware:
		return c.Next()
	})

	app.Use(func(c *fiber.Ctx) error {
		SetLocal[controllers.KeycloakModel](c, "keycloak", controllers.KeycloakModel{
			ClientId: config.SSO.FrontendClientID,
			Url:      config.SSO.Url,
			Realm:    config.SSO.Realm,
			Links:    make(map[string]string),
		})
		return c.Next()
	})

	app.Get("/api/public", controllers.GetIndex)

	profile := app.Group("api", keyauth.New(keyauth.Config{
		Validator: validator,
	}))

	profile.Route("v1/users", func(r fiber.Router) {
		r.Put("/", controllers.SyncUser)
		r.Get("/offline", controllers.GetOfflineData)
	})

	profile.Route("v1/authors", func(r fiber.Router) {
		r.Get("/", controllers.GetAuthors)
		r.Get("/:authorId/notes", controllers.GetNotes)
		r.Patch("/:authorId", controllers.UpdateAuthor)
		r.Delete("/:authorId", controllers.DeleteAuthor)
		r.Post("/", controllers.CreateAuthor)
	})

	profile.Route("v1/concerts", func(r fiber.Router) {
		r.Get("/", controllers.GetConcertsOfUser)
		r.Post("/", controllers.CreateConcert)
		r.Get("/:concertId", controllers.GetConcert)
		r.Delete("/:concertId", controllers.DeleteConcert)
	})

	profile.Route("v1/elements", func(r fiber.Router) {
		r.Get("/parentDecks", controllers.GetParentDecks)
	})

	return app
}

func SetLocal[T any](c *fiber.Ctx, key string, value T) {
	c.Locals(key, value)
}
