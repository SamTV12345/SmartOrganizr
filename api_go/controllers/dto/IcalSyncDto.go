package dto

type IcalSyncDto struct {
	Id  string `json:"id"  validate:"required"`
	Url string `json:"url" validate:"required"`
}
