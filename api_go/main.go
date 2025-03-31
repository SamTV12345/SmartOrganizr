package main

import (
	"api_go/config"
	db2 "api_go/db"
	"api_go/routers"
	"log"
	"strconv"
)

func main() {
	log.Println("Starting smartorganizr")
	appConfig, err := config.ReadConfig()
	if err != nil {
		log.Fatalf("Error reading config file, %s", err)
		return
	}

	log.Printf("Connecting with user %s to database %s:%d", appConfig.Database.User, appConfig.Database.Host, appConfig.Database.Port)

	var db = db2.Setup(appConfig.Database)
	var app = routers.SetupRouter(db, appConfig)
	err = app.Listen("0.0.0.0:" + strconv.Itoa(appConfig.Port))
	if err != nil {
		log.Fatalf("Error starting server, %s", err)
		return
	}
}
