package models

import "time"

type ConfirmStatus int

const (
	Ok ConfirmStatus = iota
	Deny
	Maybe
	NotYetDecided
)

type Event struct {
	UId         string
	Summary     string
	Url         string
	GeoDateX    *float64
	GeoDateY    *float64
	Location    *string
	TzId        *string
	Description *string
	StartDate   *time.Time
	EndDate     *time.Time
	Status      ConfirmStatus
}
