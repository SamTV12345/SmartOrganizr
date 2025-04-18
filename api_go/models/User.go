package models

type User struct {
	UserId           string `json:"userId"`
	Username         string `json:"username"`
	SideBarCollapsed bool   `json:"sideBarCollapsed"`
	ProfilePic       []byte `json:"profilePicUrl"`
	Email            string `json:"email"`
	Firstname        string `json:"firstname"`
	Lastname         string `json:"lastname"`
	TelephoneNumber  string `json:"telephoneNumber"`
}
