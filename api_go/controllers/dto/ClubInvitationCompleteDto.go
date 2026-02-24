package dto

type ClubInvitationCompleteDto struct {
	Password        string `json:"password"`
	ConfirmPassword string `json:"confirm_password"`
	Firstname       string `json:"firstname"`
	Lastname        string `json:"lastname"`
}
