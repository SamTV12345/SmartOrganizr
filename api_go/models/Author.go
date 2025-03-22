package models

type Author struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	ExtraInformation string `json:"extraInformation"`
	User             User   `json:"user"`
}
