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
}

type AppConfigSSO struct {
	ClientID string
	Issuer   string
	Url      string
}

func (c AppConfigDatabase) GetDSN() string {
	return c.User + ":" + c.Password + "@tcp(" + c.Host + ":" + string(rune(c.Port)) + ")/smartorganizr"
}

type AppConfig struct {
	Database AppConfigDatabase
	Port     int
	SSO      AppConfigSSO
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
	viper.SetDefault(AppPort, 3000)
	viper.SetDefault(DatabaseUser, "root")
	viper.SetDefault(DatabasePassword, "root")
	viper.SetDefault(SSOIssuer, "http://localhost/realms/smartOrganizr")
	viper.SetDefault(SSOUrl, "http://localhost/")
	viper.SetDefault(SSOClientID, "account")

	var config = AppConfig{
		Database: struct {
			Host     string
			Port     int
			User     string
			Password string
		}{Host: viper.GetString(DatabaseHost), Port: viper.GetInt(DatabasePort), User: viper.GetString(DatabaseUser), Password: viper.GetString(DatabasePassword)},
		Port: viper.GetInt(AppPort),
		SSO: struct {
			ClientID string
			Issuer   string
			Url      string
		}{ClientID: viper.GetString(SSOClientID), Issuer: viper.GetString(SSOIssuer), Url: viper.GetString(SSOUrl)},
	}
	return config, nil
}
