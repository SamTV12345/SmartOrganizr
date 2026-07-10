package dto

type CalendarTokenDto struct {
	Token string `json:"token" validate:"required"`
	URL   string `json:"url"   validate:"required"`
}
