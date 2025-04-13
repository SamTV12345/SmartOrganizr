package db

import (
	"api_go/config"
	sql2 "api_go/data/sql"
	"context"
	"database/sql"
	"github.com/go-sql-driver/mysql"
	_ "github.com/go-sql-driver/mysql"
	"github.com/pressly/goose/v3"
	"log"
	"strconv"
	"time"
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
	println(configMysql.FormatDSN())
	open, err := sql.Open("mysql", configMysql.FormatDSN())
	if err != nil {
		return nil
	}

	open.SetConnMaxLifetime(time.Minute * 3)
	open.SetMaxOpenConns(10)
	open.SetMaxIdleConns(10)
	var queries = New(open)
	err = goose.SetDialect("mysql")
	if err != nil {
		log.Fatalf("goose.SetDialect(\"mysql\"): %v", err)
	}
	goose.SetBaseFS(sql2.EmbedMigrations) //
	if _, err := queries.HealthCheck(context.Background()); err != nil {
		log.Fatalf("Error connecting to database: %s", err)
	}

	if err := goose.Up(open, "migrations"); err != nil { //
		panic(err)
	}
	if err := goose.Version(open, "migrations"); err != nil {
		log.Fatal(err)
	}

	return queries
}
