package dto

type UserPatchDto struct {
	Username         string `json:"username"`
	SideBarCollapsed bool   `json:"sideBarCollapsed"`
	Firstname        string `json:"firstname"`
	Lastname         string `json:"lastname"`
	Email            string `json:"email"`
	TelephoneNumber  string `json:"telephoneNumber"`
}
