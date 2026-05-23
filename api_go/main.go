package main

import (
	"api_go/config"
	db2 "api_go/db"
	_ "api_go/docs"
	"api_go/logger"
	"api_go/reoccuring"
	"api_go/routers"
	"strconv"
)

// @title          SmartOrganizr API
// @version        1.0
// @description    Backend API for SmartOrganizr.
// @BasePath       /api
// @schemes        https http

func main() {

	setupLogger := logger.SetupLogger()
	defer setupLogger.Sync() // flushes buffer, if any
	setupLogger.Info("Starting smartorganizr")
	appConfig, err := config.ReadConfig()
	if err != nil {
		setupLogger.Fatalf("Error reading config file, %s", err)
		return
	}

	setupLogger.Infof("Connecting with user %s to database %s:%d", appConfig.Database.User, appConfig.Database.Host, appConfig.Database.Port)

	var db, _ = db2.Setup(appConfig.Database)
	var app = routers.SetupRouter(db, appConfig, setupLogger)

	reoccuring.ExecuteOncePerHour(db, setupLogger)

	err = app.Listen("0.0.0.0:" + strconv.Itoa(appConfig.Port))
	if err != nil {
		setupLogger.Fatalf("Error starting server, %s", err)
		return
	}

}
