package db

import (
	"api_go/config"
	"context"
	"database/sql"
	"github.com/go-sql-driver/mysql"
	_ "github.com/go-sql-driver/mysql"
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
	}
	open, err := sql.Open("mysql", configMysql.FormatDSN())
	if err != nil {
		return nil
	}
	var queries = New(open)

	if _, err := queries.HealthCheck(context.Background()); err != nil {
		log.Fatalf("Error connecting to database: %s", err)
	}

	return queries
}
