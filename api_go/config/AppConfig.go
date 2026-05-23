package config

import (
	"log"
	"os"
	"strings"

	"github.com/spf13/viper"
	"github.com/subosito/gotenv"
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
	// Optionally load a .env file into the process environment so AutomaticEnv() picks
	// it up. Lookup order:
	//   1. SMARTORGANIZR_ENV_FILE (explicit override)
	//   2. ./.env
	//   3. ./api_go/.env (when run from the repo root)
	// Real environment variables always take precedence — gotenv.Load does not override them.
	loadEnvFile()

	viper.SetConfigName("config") // Legacy config.env in viper's dotted-key format
	viper.SetConfigType("env")
	viper.AddConfigPath(".")

	viper.AutomaticEnv()
	viper.SetEnvPrefix("smartorganizr")                    // will be uppercased automatically
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_")) // this is useful e.g. want to use . in Get() calls, but environmental variables to use _ delimiters (e.g. app.port -> APP_PORT)
	// Read the legacy config file — absence is fine when configuration comes from env vars or a .env file.
	if err := viper.ReadInConfig(); err != nil {
		if _, notFound := err.(viper.ConfigFileNotFoundError); !notFound {
			log.Printf("Error reading config file, %s\n", err)
		}
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

func loadEnvFile() {
	if explicit := os.Getenv("SMARTORGANIZR_ENV_FILE"); explicit != "" {
		if err := gotenv.Load(explicit); err != nil {
			log.Printf("Error loading env file %s: %s\n", explicit, err)
			return
		}
		log.Printf("Loaded env file: %s\n", explicit)
		return
	}

	for _, candidate := range []string{".env", "api_go/.env"} {
		if _, err := os.Stat(candidate); err != nil {
			continue
		}
		if err := gotenv.Load(candidate); err != nil {
			log.Printf("Error loading env file %s: %s\n", candidate, err)
			continue
		}
		log.Printf("Loaded env file: %s\n", candidate)
		return
	}
}
