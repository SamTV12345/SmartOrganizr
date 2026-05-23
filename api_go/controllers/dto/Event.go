package dto

import "time"

type Event struct {
	UId         string     `json:"uid"         validate:"required"`
	Summary     string     `json:"summary"     validate:"required"`
	Url         string     `json:"url"         validate:"required"`
	GeoDateX    *float64   `json:"geoDateX"`
	GeoDateY    *float64   `json:"geoDateY"`
	Location    *string    `json:"location"`
	TzId        *string    `json:"tzId"`
	Description *string    `json:"description"`
	StartDate   *time.Time `json:"startDate"`
	EndDate     *time.Time `json:"endDate"`
	Status      int        `json:"status"      validate:"required"`
}
