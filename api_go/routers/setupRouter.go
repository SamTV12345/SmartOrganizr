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
	"io/fs"
	"strings"
	"sync"
	"time"

	"github.com/Nerzal/gocloak/v13"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/keyauth"
	"github.com/gofiber/fiber/v3/middleware/static"
	"go.uber.org/zap"
)

func SetupRouter(queries *db.Queries, config config.AppConfig, logger *zap.SugaredLogger) *fiber.App {

	app := fiber.New(fiber.Config{
		BodyLimit: 30 * 1024 * 1024, // allow club file uploads up to 25 MB plus overhead
	})
	validate := validator.New(validator.WithRequiredStructEnabled())

	app.Use(cors.New(cors.Config{
		AllowOrigins: []string{"*"},
		AllowHeaders: []string{"*"},
	}))

	var token = &models.MutexedKeycloakToken{
		Jwt: nil,
		Mu:  sync.Mutex{},
	}
	var client = gocloak.NewClient(config.SSO.Url)

	app.Get("/health", func(c fiber.Ctx) error {
		return c.SendString("OK")
	})

	var profile fiber.Router
	if config.SSO.Issuer != "" {
		jwtValidator, err := auth.NewKeycloakJWTValidator(config.SSO.Issuer, config.SSO.ClientID, logger)
		if err != nil {
			panic(err)
		}
		profile = app.Group("api", keyauth.New(keyauth.Config{
			Next: func(c fiber.Ctx) bool {
				return strings.HasPrefix(c.Path(), "/api/public")
			},
			Validator: jwtValidator,
		}))
		go func() {
			for {
				logger.Infof("Retrieving token")
				if token.Jwt == nil {
					tokenJwt, err := client.LoginClient(context.Background(), config.SSO.ClientID, config.SSO.ClientSecret, config.SSO.Realm)
					if err != nil {
						logger.Info("Error renewing keycloak token ", err.Error())
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
		app.Use(func(c fiber.Ctx) error {
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
	var mailService = service.NewMailService(config.SMTP)
	var clubInvitationService = service.NewClubInvitationService(queries, mailService, config.App.URL)

	var clubMemberService = service.NewClubMemberService(queries, clubService)
	var notificationHub = service.NewNotificationHub()
	var messageService = service.NewMessageService(queries, notificationHub)
	var pinboardService = service.NewPinboardService(queries, clubMemberService, notificationHub)
	var clubFileService = service.NewClubFileService(queries)
	var clubEventService = service.NewClubEventService(queries, clubMemberService, notificationHub)

	var wikidataService = service.NewWikidataService(
		"https://query.wikidata.org/sparql",
		"SmartOrganizr/1.0 (https://github.com/SamTV12345/SmartOrganizr)",
	)

	var aiService = service.NewAIService(
		config.AI.BaseURL,
		config.AI.Token,
		config.AI.Model,
	)

	var aiChatService = &service.AIChatService{
		Queries:    queries,
		Ctx:        context.Background(),
		AI:         aiService,
		NoteSearch: noteService,
	}

	var inventoryService = service.NewInventoryService(queries, aiService)
	var clubSectionService = service.NewClubSectionService(queries, clubMemberService)

	noteService.FolderService = &folderService

	var concertService = service.ConcertService{
		Queries:     queries,
		Ctx:         context.Background(),
		NoteService: noteService,
	}

	app.Use(func(c fiber.Ctx) error {
		SetLocal[service.UserService](c, constants.UserService, userService)
		SetLocal[service.FolderService](c, constants.FolderService, folderService)
		SetLocal[service.NoteService](c, constants.NoteService, noteService)
		SetLocal[service.KeycloakService](c, constants.KeycloakService, keycloakService)
		SetLocal[service.AuthorService](c, constants.AuthorService, authorService)
		SetLocal[service.ConcertService](c, constants.ConcertService, concertService)
		SetLocal[*validator.Validate](c, constants.Validator, validate)
		SetLocal[service.IcalSyncService](c, constants.IcalSyncService, icalSyncService)
		SetLocal[service.EventService](c, constants.EventService, eventService)
		SetLocal[service.ClubService](c, constants.ClubService, clubService)
		SetLocal[service.ClubMemberService](c, constants.ClubMemberService, clubMemberService)
		SetLocal[service.ClubInvitationService](c, constants.ClubInvitationService, clubInvitationService)
		SetLocal[service.MessageService](c, constants.MessageService, messageService)
		SetLocal[service.PinboardService](c, constants.PinboardService, pinboardService)
		SetLocal[service.ClubFileService](c, constants.ClubFileService, clubFileService)
		SetLocal[service.ClubEventService](c, constants.ClubEventService, clubEventService)
		SetLocal[*service.NotificationHub](c, constants.NotificationHub, notificationHub)
		SetLocal[*service.WikidataService](c, constants.WikidataService, wikidataService)
		SetLocal[*service.AIService](c, constants.AIService, aiService)
		SetLocal[*service.AIChatService](c, constants.AIChatService, aiChatService)
		SetLocal[service.InventoryService](c, constants.InventoryService, inventoryService)
		SetLocal[service.ClubSectionService](c, constants.ClubSectionService, clubSectionService)
		SetLocal[string](c, constants.AppBaseURL, config.App.URL)

		return c.Next()
	})

	app.Use(func(c fiber.Ctx) error {
		SetLocal[dto.KeycloakModel](c, "keycloak", dto.KeycloakModel{
			ClientId:  config.SSO.FrontendClientID,
			Url:       config.SSO.Url,
			Realm:     config.SSO.Realm,
			AiEnabled: aiService.IsConfigured(),
		})
		return c.Next()
	})

	app.Get("/public", controllers.GetIndex)
	app.Get("/public/calendar/:token.ics", controllers.GetCalendarFeed)
	app.Get("/public/users/:userId/:image.png", controllers.GetUserImage)
	app.Get("/api/public/invitations/:token", controllers.GetPublicClubInvitation)
	app.Post("/api/public/invitations/:token/complete", controllers.CompletePublicClubInvitation)

	// Serve the React ui
	uiFS, _ := fs.Sub(ui.Web, "dist")
	app.Use("/ui", static.New("", static.Config{
		FS:     uiFS,
		Browse: false,
	}))

	// Fallback to index.html
	app.Use("/ui", func(c fiber.Ctx) error {
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
		r.Post("/calendar-token", controllers.RotateCalendarToken)
		r.Get("/calendar-token", controllers.GetCalendarToken)
		r.Patch("/:userId", controllers.UpdateUser)
		r.Post("/:userId/profile", controllers.UploadProfile)
		r.Post("/:userId/konzertmeister-url", controllers.SetKonzertmeisterUrl)
		r.Post("/:userId/konzertmeister-url/sync", controllers.SyncKonzertmeisterUrl)
		r.Get("/:userId/konzertmeister-url", controllers.GetKonzertmeisterUrl)
		r.Get("/me", controllers.GetUserProfile)
		r.Get("/:userId/pinboard/recent", controllers.GetRecentPinboardForUser)
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
		r.Put("/:concertId", controllers.UpdateConcert)
		r.Delete("/:concertId", controllers.DeleteConcert)
	})

	profile.Route("v1/clubs", func(r fiber.Router) {
		r.Get("/:userId", controllers.GetAllClubsForMe)
		r.Post("/", controllers.PostClub)
		r.Patch("/:clubId", controllers.UpdateClub)
		r.Delete("/:clubId", controllers.DeleteClub)
		r.Get("/:clubId/me/permissions", controllers.GetMyClubPermissions)
		r.Get("/:clubId/members", controllers.GetClubMembers)
		r.Patch("/:clubId/members/:memberUserId/role", controllers.PatchClubMemberRole)
		r.Patch("/:clubId/members/:memberUserId/authorized", controllers.PatchClubMemberAuthorized)
		r.Patch("/:clubId/members/:memberUserId/section", controllers.PatchClubMemberSection)
		r.Get("/:clubId/sections", controllers.GetClubSections)
		r.Post("/:clubId/sections", controllers.PostClubSection)
		r.Put("/:clubId/sections/:sectionId", controllers.PutClubSection)
		r.Delete("/:clubId/sections/:sectionId", controllers.DeleteClubSection)
		// "/members/me" must be registered before "/members/:memberUserId"
		r.Delete("/:clubId/members/me", controllers.LeaveClub)
		r.Delete("/:clubId/members/:memberUserId", controllers.DeleteClubMember)
		r.Get("/:clubId/invitations", controllers.GetClubInvitations)
		r.Delete("/:clubId/invitations/:invitationId", controllers.DeleteClubInvitation)
		r.Get("/:clubId/members/export", controllers.ExportClubMembersCSV)
		r.Post("/:clubId/members/import", controllers.ImportClubMembersCSV)
		r.Post("/:clubId/members/invite", controllers.InviteClubMembers)
		r.Get("/:clubId/messages/candidates", controllers.GetClubMessageCandidates)
		r.Get("/:clubId/messages/chats", controllers.GetClubChats)
		r.Post("/:clubId/messages/chats", controllers.CreateClubChat)
		r.Get("/:clubId/messages/chats/:chatId", controllers.GetClubChatMessages)
		r.Post("/:clubId/messages/chats/:chatId", controllers.PostClubChatMessage)
		r.Patch("/:clubId/messages/chats/:chatId/read", controllers.MarkChatRead)
		r.Get("/:clubId/pinboard", controllers.GetClubPinboard)
		r.Post("/:clubId/pinboard", controllers.CreateClubPinboardPost)
		r.Patch("/:clubId/pinboard/:postId", controllers.UpdateClubPinboardPost)
		r.Delete("/:clubId/pinboard/:postId", controllers.DeleteClubPinboardPost)
		r.Get("/:clubId/files", controllers.GetClubFiles)
		r.Post("/:clubId/files", controllers.UploadClubFile)
		r.Get("/:clubId/files/:fileId", controllers.DownloadClubFile)
		r.Delete("/:clubId/files/:fileId", controllers.DeleteClubFile)
		r.Get("/:clubId/events", controllers.ListClubEvents)
		r.Post("/:clubId/events", controllers.CreateClubEvent)
		r.Get("/:clubId/events/:eventId", controllers.GetClubEvent)
		r.Put("/:clubId/events/:eventId", controllers.UpdateClubEvent)
		r.Post("/:clubId/events/:eventId/cancel", controllers.CancelClubEvent)
		r.Delete("/:clubId/events/:eventId", controllers.DeleteClubEvent)
		r.Put("/:clubId/events/:eventId/response", controllers.RespondToClubEvent)
		r.Get("/:clubId/events/:eventId/attendance", controllers.GetClubEventAttendance)
	})

	profile.Route("v1/club-events", func(r fiber.Router) {
		r.Get("/", controllers.ListMyClubEvents)
	})

	profile.Route("v1/notifications", func(r fiber.Router) {
		r.Get("/stream", controllers.StreamNotifications)
		r.Get("/unread-summary", controllers.GetUnreadSummary)
	})

	profile.Route("v1/invitations", func(r fiber.Router) {
		r.Post("/:token/accept", controllers.AcceptClubInvitation)
	})

	profile.Route("v1/autocomplete", func(r fiber.Router) {
		r.Get("/works", controllers.GetWorksAutocomplete)
		r.Get("/authors", controllers.GetAuthorsAutocomplete)
	})

	profile.Route("v1/works", func(r fiber.Router) {
		r.Post("/from-wikidata", controllers.PostWorkFromWikidata)
	})

	profile.Route("v1/inventory", func(r fiber.Router) {
		r.Post("/identify", controllers.PostInventoryIdentify)
		r.Post("/sweeps", controllers.PostInventorySweep)
		r.Post("/sweeps/:sweepId/sightings", controllers.PostInventorySighting)
		r.Post("/sweeps/:sweepId/complete", controllers.PostInventorySweepComplete)
		r.Post("/sweeps/:sweepId/apply-moves", controllers.PostInventoryApplyMoves)
		r.Put("/folders/:folderId/tag", controllers.PutMappeTag)
		r.Get("/tags/:tagId", controllers.GetMappeTag)
		r.Get("/lookup", controllers.GetInventoryLookup)
		r.Get("/attention", controllers.GetInventoryAttention)
		r.Post("/notes/:noteId/number", controllers.PostInventoryNumber)
		r.Get("/notes/:noteId/last-seen", controllers.GetInventoryLastSeen)
	})

	profile.Route("v1/ai", func(r fiber.Router) {
		r.Post("/identify-music", controllers.PostIdentifyMusic)
		r.Get("/chat/sessions", controllers.GetAiChatSessions)
		r.Post("/chat/sessions", controllers.PostAiChatSession)
		r.Get("/chat/sessions/:sessionId/messages", controllers.GetAiChatMessages)
		r.Post("/chat/sessions/:sessionId/messages", controllers.PostAiChatMessage)
		r.Delete("/chat/sessions/:sessionId", controllers.DeleteAiChatSession)
	})

	profile.Route("v1/elements", func(r fiber.Router) {
		r.Get("/parentDecks", controllers.GetParentDecks)
		r.Get("/notes", controllers.GetNotes)
		r.Delete("/:elementId", controllers.DeleteElement)
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

func SetLocal[T any](c fiber.Ctx, key string, value T) {
	c.Locals(key, value)
}
