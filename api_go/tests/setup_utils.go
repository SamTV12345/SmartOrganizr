package tests

import (
	"api_go/config"
	db2 "api_go/db"
	"api_go/logger"
	"api_go/routers"
	"context"
	"github.com/gofiber/fiber/v3"
	"github.com/moby/moby/api/types/network"
	mysql2 "github.com/testcontainers/testcontainers-go/modules/mysql"
	"net/http"
	"os"
	"testing"
)

func init() {

}

func TestMain(m *testing.M) {
	// Setup vor allen Tests
	code := m.Run() // Führt alle Tests aus

	// Teardown nach allen Tests
	if mysqlInstance != nil {
		mysqlInstance.Terminate(context.Background())
	}

	os.Exit(code) // Beendet das Testprogramm mit dem entsprechenden Statuscode
}

var mysqlInstance *mysql2.MySQLContainer = nil
var port network.Port

// testQueries gives tests direct DB access, e.g. to seed data owned by a
// different user than the fixed test user "12345".
var testQueries *db2.Queries

func SetupTest(t *testing.T) *fiber.App {
	ctx := context.Background()
	if mysqlInstance == nil {
		var err error
		mysqlInstance, err = mysql2.Run(ctx, "mysql:lts")
		if err != nil {
			panic(err)
		}
	}
	host, err := mysqlInstance.Host(ctx)
	if err != nil {
		panic(err)
	}
	port, err = mysqlInstance.MappedPort(ctx, "3306")
	if err != nil {
		panic(err)
	}
	var appconfig = config.AppConfig{
		Database: config.AppConfigDatabase{
			Database: "test",
			Host:     host,
			Port:     int(port.Num()),
			Password: "test",
			User:     "test",
		},
		Port: 999,
		App: config.AppParameters{
			URL: "http://localhost:999",
		},
		AI: config.AppConfigAI{
			Token:   os.Getenv("SMARTORGANIZR_AI_TOKEN"),
			BaseURL: "https://api.mistral.ai/v1",
			Model:   "pixtral-12b-2409",
		},
	}

	var db, rawDB = db2.Setup(appconfig.Database)
	testQueries = db
	setupLogger := logger.SetupLogger()
	var app = routers.SetupRouter(db, appconfig, setupLogger)
	var syncUser, _ = http.NewRequest("PUT", "http://localhost/api/v1/users/", nil)
	app.Test(syncUser)
	if app == nil {
		t.Fatalf("failed to setup router")
	}

	t.Cleanup(func() {
		rawDB.Exec("SET FOREIGN_KEY_CHECKS = 0;")
		rawDB.Exec("DELETE FROM note_in_concert")
		err = db.DeleteAllConcerts(ctx)
		if err != nil {
			t.Fatalf("failed to delete all concerts: %v", err)
		}
		err = db.DeleteAllElements(ctx)
		if err != nil {
			t.Fatalf("failed to delete all data: %v", err)
		}
		err := db.DeleteAllAuthors(ctx)
		if err != nil {
			t.Fatalf("failed to delete all data: %v", err)
		}
		err = db.DeleteAllUser(ctx)
		if err != nil {
			t.Fatalf("failed to delete all data: %v", err)
		}
		// Club-related tables have no generated DeleteAll queries; clear them with
		// raw deletes (FK checks are disabled above) so club tests stay isolated.
		for _, table := range []string{
			"inventory_sighting",
			"inventory_sweep",
			"mappe_tag",
			"club_poll_vote",
			"club_poll_option",
			"club_poll",
			"club_section",
			"club_file",
			"club_pinboard_post",
			"club_chat_message",
			"club_chat",
			"club_invitation",
			"club_participant",
			"clubs",
			"ai_chat_message",
			"ai_chat_session",
		} {
			rawDB.Exec("DELETE FROM " + table)
		}
		rawDB.Exec("SET FOREIGN_KEY_CHECKS = 1;")
	})

	return app
}
