package dto

type User struct {
	UserId           string  `json:"userId"           validate:"required"`
	Username         string  `json:"username"         validate:"required"`
	SideBarCollapsed bool    `json:"sideBarCollapsed" validate:"required"`
	Email            string  `json:"email"            validate:"required"`
	Firstname        string  `json:"firstname"        validate:"required"`
	Lastname         string  `json:"lastname"         validate:"required"`
	TelephoneNumber  string  `json:"telephoneNumber"  validate:"required"`
	ProfilePicUrl    *string `json:"profilePicUrl"`
}
