package models

type Author struct {
	ID               int32  `json:"id"`
	Name             string `json:"name"`
	ExtraInformation string `json:"extraInformation"`
	User             User   `json:"user"`
}
