package dto

type AuthorCreateDto struct {
	ExtraInformation string `json:"extraInformation" validate:"required"`
	Name             string `json:"name"             validate:"required"`
	WikidataID       string `json:"wikidataId,omitempty"`
	BirthYear        *int16 `json:"birthYear,omitempty"`
	DeathYear        *int16 `json:"deathYear,omitempty"`
}
