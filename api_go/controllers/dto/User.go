package dto

type User struct {
	UserId           string  `json:"userId"`
	Username         string  `json:"username"`
	SideBarCollapsed bool    `json:"sideBarCollapsed"`
	ProfilePicUrl    *string `json:"profilePicUrl"`
}
