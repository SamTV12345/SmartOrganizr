package dto

type UserPatchDto struct {
	Username         string `json:"username"         validate:"required"`
	SideBarCollapsed bool   `json:"sideBarCollapsed" validate:"required"`
	Firstname        string `json:"firstname"        validate:"required"`
	Lastname         string `json:"lastname"         validate:"required"`
	Email            string `json:"email"            validate:"required"`
	TelephoneNumber  string `json:"telephoneNumber"  validate:"required"`
}
