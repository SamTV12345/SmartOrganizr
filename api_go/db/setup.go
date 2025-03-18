package db

import (
	"api_go/config"
	"database/sql"
)

func Setup(config config.AppConfigDatabase) *Queries {
	open, err := sql.Open("mysql", config.GetDSN())
	if err != nil {
		return nil
	}
	var queries = New(open)
	return queries
}
