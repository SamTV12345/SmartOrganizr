package dto

type AuthorCreateDto struct {
	ExtraInformation string `json:"extraInformation" validate:"required"`
	Name             string `json:"name"             validate:"required"`
}
