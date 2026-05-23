package dto

type ClubInvitationCompleteDto struct {
	Password        string `json:"password"         validate:"required"`
	ConfirmPassword string `json:"confirm_password" validate:"required"`
	Firstname       string `json:"firstname"        validate:"required"`
	Lastname        string `json:"lastname"         validate:"required"`
}
