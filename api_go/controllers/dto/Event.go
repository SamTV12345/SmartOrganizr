package dto

import "time"

type Event struct {
	UId         string     `json:"uid"`
	Summary     string     `json:"summary"`
	Url         string     `json:"url"`
	GeoDateX    *float64   `json:"geoDateX"`
	GeoDateY    *float64   `json:"geoDateY"`
	Location    *string    `json:"location"`
	TzId        *string    `json:"tzId"`
	Description *string    `json:"description"`
	StartDate   *time.Time `json:"startDate"`
	EndDate     *time.Time `json:"endDate"`
}
