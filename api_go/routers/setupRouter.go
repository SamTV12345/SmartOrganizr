package routers

import (
	"api_go/auth"
	"api_go/config"
	"api_go/constants"
	"api_go/controllers"
	"api_go/controllers/dto"
	"api_go/db"
	"api_go/models"
	"api_go/service"
	"api_go/ui"
	"context"
	"github.com/Nerzal/gocloak/v13"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
	"github.com/gofiber/fiber/v2/middleware/keyauth"
	"go.uber.org/zap"
	"net/http"
	"sync"
	"time"
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

	var token = &models.MutexedKeycloakToken{
		Jwt: nil,
		Mu:  sync.Mutex{},
	}
	var client = gocloak.NewClient(config.SSO.Url)
	logger, _ := zap.NewProduction()
	defer logger.Sync() // flushes buffer, if any
	sugar := logger.Sugar()

	go func() {
		for {
			if token.Jwt == nil {
				tokenJwt, err := client.LoginAdmin(context.Background(), config.SSO.AdminUser, config.SSO.AdminPassword, config.SSO.Realm)
				if err != nil {
					sugar.Info("Error renewing keycloak token %s", err.Error())
				}
				sugar.Info("Renewing keycloak token")
				token.Mu.Lock()
				token.Jwt = tokenJwt
				token.Mu.Unlock()
			}
			time.Sleep(time.Second * time.Duration(config.SSO.SSORefreshInternal))
		}
	}()

	var keycloakService = service.NewKeycloakService(
		config.SSO.Realm,
		token,
		client)

	var userService = service.UserService{
		Queries: queries,
		Ctx:     context.Background(),
	}

	var noteService = service.NoteService{
		Queries:     queries,
		UserService: &userService,
		Ctx:         context.Background(),
	}

	var authorService = service.AuthorService{
		Queries:     queries,
		Ctx:         context.Background(),
		NoteService: noteService,
		UserService: userService,
	}

	noteService.AuthorService = &authorService

	var folderService = service.FolderService{
		Queries:       queries,
		Ctx:           context.Background(),
		UserService:   userService,
		NoteService:   noteService,
		AuthorService: authorService,
	}

	noteService.FolderService = &folderService

	var concertService = service.ConcertService{
		Queries:     queries,
		Ctx:         context.Background(),
		NoteService: noteService,
	}

	app.Use(func(c *fiber.Ctx) error {
		SetLocal[service.UserService](c, constants.UserService, userService)
		SetLocal[service.FolderService](c, constants.FolderService, folderService)
		SetLocal[service.NoteService](c, constants.NoteService, noteService)
		SetLocal[service.KeycloakService](c, constants.KeycloakService, keycloakService)
		SetLocal[string](c, constants.BaseURL, config.App.URL)
		SetLocal[service.AuthorService](c, constants.AuthorService, authorService)
		SetLocal[service.ConcertService](c, constants.ConcertService, concertService)
		// Go to next middleware:
		return c.Next()
	})

	app.Use(func(c *fiber.Ctx) error {
		SetLocal[dto.KeycloakModel](c, "keycloak", dto.KeycloakModel{
			ClientId: config.SSO.FrontendClientID,
			Url:      config.SSO.Url,
			Realm:    config.SSO.Realm,
			Links:    make(map[string]dto.Link),
		})
		return c.Next()
	})

	app.Get("/api/public", controllers.GetIndex)

	app.Get("/public/users/:userId/:image.png", controllers.GetUserImage)

	profile := app.Group("api", keyauth.New(keyauth.Config{
		Validator: validator,
	}))

	// Serve the React ui
	app.Use("/ui", filesystem.New(filesystem.Config{
		Root:       http.FS(ui.Web),
		PathPrefix: "dist",
		Browse:     false,
	}))

	// Fallback to index.html
	app.Use("/ui", func(c *fiber.Ctx) error {
		file, err := ui.Web.Open("dist/index.html")
		if err != nil {
			return c.Status(fiber.StatusNotFound).SendString("404 Not Found")
		}
		defer file.Close()
		c.Set("Content-Type", "text/html")
		return c.SendStream(file)
	})

	profile.Route("v1/users", func(r fiber.Router) {
		r.Put("/", controllers.SyncUser)
		r.Get("/token", controllers.GetUser)
		r.Patch("/:userId", controllers.UpdateUser)
		r.Post("/:userId/profile", controllers.UploadProfile)
		r.Get("/me", controllers.GetUserProfile)
		r.Get("/offline", controllers.GetOfflineData)
		r.Delete("/:userId/profile", controllers.DeleteProfilePic)
	})

	profile.Route("v1/authors", func(r fiber.Router) {
		r.Get("", controllers.GetAuthors)
		r.Get("/:authorId/notes", controllers.GetNotesOfAuthor)
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
		r.Get("/notes", controllers.GetNotes)
		r.Get("/notes/:noteId", controllers.GetNodeByID)
		r.Post("/folders", controllers.CreateFolder)
		r.Get("/:folderId/children", controllers.FindNextChildren)
		r.Get("/folders", controllers.SearchFolders)
		r.Post("/notes", controllers.CreateNote)
		r.Patch("/notes/:noteId", controllers.UpdateNote)
		r.Get("/:noteId/parent", controllers.GetParentOfNote)
		r.Get("/:noteId/pdf", controllers.GetNoteasPDF)
		r.Post("/:noteId/pdf", controllers.UpdatePDFOfNote)
		r.Get("/:folderId/export", controllers.ExportPDFFromNotes)
	})

	return app
}

func SetLocal[T any](c *fiber.Ctx, key string, value T) {
	c.Locals(key, value)
}
