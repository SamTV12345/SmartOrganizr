package models

type Author struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	ExtraInformation string `json:"extraInformation"`
	WikidataID       string `json:"wikidataId,omitempty"`
	BirthYear        *int16 `json:"birthYear,omitempty"`
	DeathYear        *int16 `json:"deathYear,omitempty"`
	User             User   `json:"user"`
}
