package models

import "time"

type IcalSyncModel struct {
	Id         string
	Url        string
	UserID     string
	LastSynced time.Time
}
