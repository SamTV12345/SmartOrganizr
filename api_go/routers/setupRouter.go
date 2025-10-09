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
	"net/http"
	"sync"
	"time"

	"github.com/Nerzal/gocloak/v13"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
	"github.com/gofiber/fiber/v2/middleware/keyauth"
	"go.uber.org/zap"
)

func SetupRouter(queries *db.Queries, config config.AppConfig, logger *zap.SugaredLogger) *fiber.App {

	app := fiber.New()
	validate := validator.New(validator.WithRequiredStructEnabled())

	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "*",
	}))

	var token = &models.MutexedKeycloakToken{
		Jwt: nil,
		Mu:  sync.Mutex{},
	}
	var client = gocloak.NewClient(config.SSO.Url)

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.SendString("OK")
	})

	var profile fiber.Router
	if config.SSO.Issuer != "" {
		jwtValidator, err := auth.NewKeycloakJWTValidator(config.SSO.Issuer, config.SSO.ClientID, logger)
		if err != nil {
			panic(err)
		}
		profile = app.Group("api", keyauth.New(keyauth.Config{
			Validator: jwtValidator,
		}))
		go func() {
			for {
				logger.Infof("Retrieving token")
				if token.Jwt == nil {
					tokenJwt, err := client.LoginClient(context.Background(), config.SSO.ClientID, config.SSO.ClientSecret, config.SSO.Realm)
					if err != nil {
						logger.Info("Error renewing keycloak token", err.Error())
					}
					logger.Info("Renewing keycloak token")
					token.Mu.Lock()
					token.Jwt = tokenJwt
					token.Mu.Unlock()
				}
				time.Sleep(time.Second * time.Duration(config.SSO.SSORefreshInternal))
			}
		}()

	} else {
		profile = app.Group("api")
		app.Use(func(c *fiber.Ctx) error {
			c.Locals("claims", &auth.Claims{
				Username:   "test",
				Email:      "test@test.com",
				FamilyName: "test",
				GivenName:  "test",
			})
			c.Locals("userId", "12345")
			return c.Next()
		})
	}

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

	var icalSyncService = service.IcalSyncService{
		Queries: queries,
	}

	var eventService = service.EventService{
		Queries: queries,
	}

	var folderService = service.FolderService{
		Queries:       queries,
		Ctx:           context.Background(),
		UserService:   userService,
		NoteService:   noteService,
		AuthorService: authorService,
	}

	var addressService = service.NewAddressService(queries)
	var clubService = service.NewClubService(queries, addressService)

	var clubMemberService = service.NewClubMemberService(queries, clubService)

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
		SetLocal[*validator.Validate](c, constants.Validator, validate)
		SetLocal[service.IcalSyncService](c, constants.IcalSyncService, icalSyncService)
		SetLocal[service.EventService](c, constants.EventService, eventService)
		SetLocal[service.ClubService](c, constants.ClubService, clubService)
		SetLocal[service.ClubMemberService](c, constants.ClubMemberService, clubMemberService)

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

	app.Get("/public", controllers.GetIndex)
	app.Get("/public/users/:userId/:image.png", controllers.GetUserImage)

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
		r.Post("/:userId/konzertmeister-url", controllers.SetKonzertmeisterUrl)
		r.Get("/:userId/konzertmeister-url", controllers.GetKonzertmeisterUrl)
		r.Get("/me", controllers.GetUserProfile)
		r.Get("/offline", controllers.GetOfflineData)
		r.Delete("/:userId/profile", controllers.DeleteProfilePic)
	})

	profile.Route("v1/events", func(r fiber.Router) {
		r.Get("/:userId", controllers.GetEvents)
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

	profile.Route("v1/clubs", func(r fiber.Router) {
		r.Get("/:userId", controllers.GetAllClubsForMe)
		r.Post("/", controllers.PostClub)
	})

	profile.Route("v1/elements", func(r fiber.Router) {
		r.Get("/parentDecks", controllers.GetParentDecks)
		r.Get("/notes", controllers.GetNotes)
		r.Get("/notes/:noteId", controllers.GetNodeByID)
		r.Post("/folders", controllers.CreateFolder)
		r.Get("/:folderId/children", controllers.FindNextChildren)
		r.Get("/folders", controllers.SearchFolders)
		r.Post("/notes", controllers.CreateNote)
		r.Patch("/folders/:folderId", controllers.UpdateFolder)
		r.Patch("/notes/:noteId", controllers.UpdateNote)
		r.Get("/:noteId/parent", controllers.GetParentOfNote)
		r.Get("/:noteId/pdf", controllers.GetNoteasPDF)
		r.Post("/:noteId/pdf", controllers.UpdatePDFOfNote)
		r.Get("/:folderId/export", controllers.ExportPDFFromNotes)
		r.Patch("/:firstElement/:lastElement", controllers.MoveToFolder)
	})

	return app
}

func SetLocal[T any](c *fiber.Ctx, key string, value T) {
	c.Locals(key, value)
}
