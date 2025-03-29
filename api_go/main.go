package main

import (
	"api_go/config"
	db2 "api_go/db"
	"api_go/routers"
	"log"
	"strconv"
)

// @title SmartOrganizr API
// @version 0.1
// @description Swagger api for SmartOrganizr
// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html
// @host localhost:8080
// @BasePath /api/v1/
// @securityDefinitions.oauth2.application OAuth2Implicit
// @tokenUrl http://localhost/realms/smartOrganizr/protocol/openid-connect/token
// @authorizationUrl http://localhost/realms/smartOrganizr/protocol/openid-connect/auth
// @scope.openid Grants read access
// @scope.email Grants write access
// @scope.profile Grants access to admin operations
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
		return
	}
}
