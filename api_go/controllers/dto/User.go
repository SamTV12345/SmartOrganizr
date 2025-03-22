package dto

type User struct {
	UserId           string `json:"userId"`
	Username         string `json:"username"`
	SelectedTheme    string `json:"selectedTheme"`
	SideBarCollapsed bool   `json:"sideBarCollapsed"`
}
