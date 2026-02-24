package config

import (
	"log"
	"strings"

	"github.com/spf13/viper"
)

type AppConfigDatabase struct {
	Host     string
	Port     int
	User     string
	Password string
	Database string
}

type AppConfigSSO struct {
	ClientID           string
	ClientSecret       string
	FrontendClientID   string
	Issuer             string
	Url                string
	Realm              string
	SSORefreshInternal int
}

type AppParameters struct {
	URL string
}

type AppConfigSMTP struct {
	Host        string
	Port        int
	Username    string
	Password    string
	FromAddress string
	Enabled     bool
}

func (c AppConfigDatabase) GetDSN() string {
	return c.User + ":" + c.Password + "@tcp(" + c.Host + ":" + string(rune(c.Port)) + ")/smartorganizr"
}

type AppConfig struct {
	Database AppConfigDatabase
	Port     int
	SSO      AppConfigSSO
	App      AppParameters
	SMTP     AppConfigSMTP
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
	viper.SetDefault(DatabaseUser, "smartOrganizr")
	viper.SetDefault(DatabasePassword, "smartOrganizr")
	viper.SetDefault(DatabaseDatabase, "smartOrganizr")
	viper.SetDefault(SSOIssuer, "http://localhost/realms/smartOrganizr")
	viper.SetDefault(SSOUrl, "http://localhost/")
	viper.SetDefault(SSOClientID, "smartOrganizr")
	viper.SetDefault(SSOClientSecret, "E0TbfxKMpx7xofUYn4OzFKfP0vq30Qsf")
	viper.SetDefault(SSOFrontendClientID, "smartorganizr-frontend")
	viper.SetDefault(SSORealm, "smartOrganizr")
	viper.SetDefault(SSORefreshInternal, 250) // in seconds
	viper.SetDefault(SMTPEnabled, true)
	viper.SetDefault(SMTPHost, "localhost")
	viper.SetDefault(SMTPPort, 1025)
	viper.SetDefault(SMTPUsername, "")
	viper.SetDefault(SMTPPassword, "")
	viper.SetDefault(SMTPFromAddress, "noreply@smartorganizr.local")

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
			ClientID           string
			ClientSecret       string
			FrontendClientID   string
			Issuer             string
			Url                string
			Realm              string
			SSORefreshInternal int
		}{ClientID: viper.GetString(SSOClientID),
			Issuer:             viper.GetString(SSOIssuer),
			Url:                viper.GetString(SSOUrl),
			FrontendClientID:   viper.GetString(SSOFrontendClientID),
			Realm:              viper.GetString(SSORealm),
			ClientSecret:       viper.GetString(SSOClientSecret),
			SSORefreshInternal: viper.GetInt(SSORefreshInternal),
		},
		App: AppParameters{URL: viper.GetString(AppURL)},
		SMTP: AppConfigSMTP{
			Host:        viper.GetString(SMTPHost),
			Port:        viper.GetInt(SMTPPort),
			Username:    viper.GetString(SMTPUsername),
			Password:    viper.GetString(SMTPPassword),
			FromAddress: viper.GetString(SMTPFromAddress),
			Enabled:     viper.GetBool(SMTPEnabled),
		},
	}

	return config, nil
}
