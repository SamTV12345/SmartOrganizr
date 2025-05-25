package dto

type IcalSyncPostDto struct {
	Url string `json:"url" validate:"required,url"`
}
