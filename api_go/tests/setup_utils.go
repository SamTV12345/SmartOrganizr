package tests

import (
	"api_go/config"
	db2 "api_go/db"
	"api_go/logger"
	"api_go/routers"
	"context"
	"github.com/docker/go-connections/nat"
	"github.com/gofiber/fiber/v2"
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
var port nat.Port

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
			Port:     port.Int(),
			Password: "test",
			User:     "test",
		},
		Port: 999,
		App: config.AppParameters{
			URL: "http://localhost:999",
		},
	}

	var db, rawDB = db2.Setup(appconfig.Database)
	setupLogger := logger.SetupLogger()
	var app = routers.SetupRouter(db, appconfig, setupLogger)
	var syncUser, _ = http.NewRequest("PUT", "/api/v1/users/", nil)
	app.Test(syncUser)
	if app == nil {
		t.Fatalf("failed to setup router")
	}

	t.Cleanup(func() {
		rawDB.Exec("SET FOREIGN_KEY_CHECKS = 0;")
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
		rawDB.Exec("SET FOREIGN_KEY_CHECKS = 1;")
	})

	return app
}
