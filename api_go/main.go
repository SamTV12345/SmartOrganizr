package main

import (
	"api_go/config"
	db2 "api_go/db"
	"api_go/logger"
	"api_go/reoccuring"
	"api_go/routers"
	"strconv"
)

func main() {

	setupLogger := logger.SetupLogger()
	defer setupLogger.Sync() // flushes buffer, if any
	setupLogger.Info("Starting smartorganizr")
	appConfig, err := config.ReadConfig()
	if err != nil {
		setupLogger.Fatalf("Error reading config file, %s", err)
		return
	}

	setupLogger.Info("Connecting with user %s to database %s:%d", appConfig.Database.User, appConfig.Database.Host, appConfig.Database.Port)

	var db = db2.Setup(appConfig.Database)
	var app = routers.SetupRouter(db, appConfig, setupLogger)

	reoccuring.ExecuteOncePerHour(db, setupLogger)

	err = app.Listen("0.0.0.0:" + strconv.Itoa(appConfig.Port))
	if err != nil {
		setupLogger.Fatalf("Error starting server, %s", err)
		return
	}

}
