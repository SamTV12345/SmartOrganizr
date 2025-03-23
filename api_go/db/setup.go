package db

import (
	"api_go/config"
	"api_go/data/sql/migrations"
	"context"
	"database/sql"
	"github.com/go-sql-driver/mysql"
	_ "github.com/go-sql-driver/mysql"
	"github.com/pressly/goose/v3"
	"github.com/pressly/goose/v3/database"
	"log"
	"strconv"
)

func Setup(config config.AppConfigDatabase) *Queries {
	configMysql := mysql.Config{
		User:                 config.User,
		Passwd:               config.Password,
		Net:                  "tcp",
		Addr:                 config.Host + ":" + strconv.Itoa(config.Port),
		DBName:               config.Database,
		AllowNativePasswords: true,
		ParseTime:            true,
	}
	open, err := sql.Open("mysql", configMysql.FormatDSN())
	if err != nil {
		return nil
	}
	var queries = New(open)

	if _, err := queries.HealthCheck(context.Background()); err != nil {
		log.Fatalf("Error connecting to database: %s", err)
	}

	p, err := goose.NewProvider(
		database.DialectMySQL,
		open,
		migrations.Embed)

	if err != nil {
		log.Fatalf("Error creating goose provider: %s", err)
	}

	pending, _ := p.HasPending(context.Background())

	if pending {
		if _, err := p.Up(context.Background()); err != nil {
			return nil
		}
	}

	version, err := p.GetDBVersion(context.Background())
	log.Printf("\nDB version after applying all up migrations: %d\n", version)

	return queries
}
