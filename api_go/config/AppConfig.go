package config

import (
	"github.com/spf13/viper"
	"log"
	"strings"
)

type AppConfigDatabase struct {
	Host     string
	Port     int
	User     string
	Password string
	Database string
}

type AppConfigSSO struct {
	ClientID         string
	FrontendClientID string
	Issuer           string
	Url              string
	Realm            string
}

func (c AppConfigDatabase) GetDSN() string {
	return c.User + ":" + c.Password + "@tcp(" + c.Host + ":" + string(rune(c.Port)) + ")/smartorganizr"
}

type AppConfig struct {
	Database AppConfigDatabase
	Port     int
	SSO      AppConfigSSO
	App      struct {
		URL string
	}
}

func ReadConfig() (AppConfig, error) {
	viper.SetConfigName("config") // Config file name without extension
	viper.SetConfigType("env")    // Config file type
	viper.AddConfigPath(".")      // Look for the config file in the current directory

	viper.AutomaticEnv()
	viper.SetEnvPrefix("smartorganizr")                    // will be uppercased automatically
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_")) // this is useful e.g. want to use . in Get() calls, but environmental variables to use _ delimiters (e.g. app.port -> APP_PORT)
	// Read the config file
	err := viper.ReadInConfig()
	if err != nil {
		log.Printf("Error reading config file, %s\n", err)
	}

	viper.SetDefault(DatabaseHost, "localhost")
	viper.SetDefault(DatabasePort, 3306)
	viper.SetDefault(AppURL, "http://localhost:8080")
	viper.SetDefault(AppPort, 8080)
	viper.SetDefault(DatabaseUser, "root")
	viper.SetDefault(DatabasePassword, "root")
	viper.SetDefault(DatabaseDatabase, "smartorganizr")
	viper.SetDefault(SSOIssuer, "http://localhost/realms/smartOrganizr")
	viper.SetDefault(SSOUrl, "http://localhost/")
	viper.SetDefault(SSOClientID, "account")
	viper.SetDefault(SSOFrontendClientID, "smartorganizr-frontend")
	viper.SetDefault(SSORealm, "smartOrganizr")

	var config = AppConfig{
		Database: struct {
			Host     string
			Port     int
			User     string
			Password string
			Database string
		}{Host: viper.GetString(DatabaseHost), Port: viper.GetInt(DatabasePort), User: viper.GetString(DatabaseUser), Password: viper.GetString(DatabasePassword), Database: viper.GetString(DatabaseDatabase)},
		Port: viper.GetInt(AppPort),
		SSO: struct {
			ClientID         string
			FrontendClientID string
			Issuer           string
			Url              string
			Realm            string
		}{ClientID: viper.GetString(SSOClientID),
			Issuer:           viper.GetString(SSOIssuer),
			Url:              viper.GetString(SSOUrl),
			FrontendClientID: viper.GetString(SSOFrontendClientID),
			Realm:            viper.GetString(SSORealm),
		},
		App: struct{ URL string }{URL: viper.GetString(AppURL)},
	}
	return config, nil
}
