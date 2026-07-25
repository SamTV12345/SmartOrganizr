package tests

import (
	"api_go/config"
	db2 "api_go/db"
	"api_go/logger"
	"api_go/routers"
	"context"
	"database/sql"

	"github.com/gofiber/fiber/v3"
	mysql2 "github.com/testcontainers/testcontainers-go/modules/mysql"
	"log"
	"net"
	"net/http"
	"os"
	"testing"
	"time"
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

// resolveMySQLEndpoint returns a host:port pair that actually speaks MySQL.
//
// On Docker (including CI) that is the published port on the Docker host. On
// Apple's `container` runtime — usable via socktainer's Docker API — published
// ports accept the TCP connection but never forward any bytes, while the
// container's own IP is fully reachable from the host. Rather than requiring an
// environment switch, we probe the mapped port for MySQL's server greeting
// (MySQL speaks first) and fall back to the container IP with the internal port.
func resolveMySQLEndpoint(ctx context.Context) (string, int) {
	host, err := mysqlInstance.Host(ctx)
	if err != nil {
		panic(err)
	}
	mapped, err := mysqlInstance.MappedPort(ctx, "3306")
	if err == nil && greets(host, mapped.Port()) {
		return host, int(mapped.Num())
	}

	containerIP, ipErr := mysqlInstance.ContainerIP(ctx)
	if ipErr != nil || containerIP == "" {
		if err != nil {
			panic(err)
		}
		// No container IP to fall back to: keep the mapped port so the failure
		// surfaces as a database error rather than as a nil-pointer panic.
		return host, int(mapped.Num())
	}
	log.Printf("mapped MySQL port is not forwarding; using the container IP %s:3306 instead", containerIP)
	return containerIP, 3306
}

// greets reports whether the endpoint sends data unprompted, which a live MySQL
// server does immediately (the initial handshake packet).
func greets(host, port string) bool {
	conn, err := net.DialTimeout("tcp", net.JoinHostPort(host, port), 3*time.Second)
	if err != nil {
		return false
	}
	defer conn.Close()
	if err := conn.SetReadDeadline(time.Now().Add(3 * time.Second)); err != nil {
		return false
	}
	buf := make([]byte, 1)
	n, err := conn.Read(buf)
	return err == nil && n == 1
}

// testQueries gives tests direct DB access, e.g. to seed data owned by a
// different user than the fixed test user "12345".
var testQueries *db2.Queries

// testDB is the same connection behind testQueries, for the rare seeding step
// that has no generated query — e.g. stamping rows with explicit timestamps.
// Production SQL stays free of test-only helpers this way.
var testDB *sql.DB

func SetupTest(t *testing.T) *fiber.App {
	ctx := context.Background()
	if mysqlInstance == nil {
		var err error
		mysqlInstance, err = mysql2.Run(ctx, "mysql:lts")
		if err != nil {
			panic(err)
		}
	}
	host, dbPort := resolveMySQLEndpoint(ctx)
	var appconfig = config.AppConfig{
		Database: config.AppConfigDatabase{
			Database: "test",
			Host:     host,
			Port:     dbPort,
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
	testDB = rawDB
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
		err := db.DeleteAllConcerts(ctx)
		if err != nil {
			t.Fatalf("failed to delete all concerts: %v", err)
		}
		err = db.DeleteAllElements(ctx)
		if err != nil {
			t.Fatalf("failed to delete all data: %v", err)
		}
		err = db.DeleteAllAuthors(ctx)
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
