package dto

type ClubMemberDto struct {
	UserID    string `json:"user_id"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	Firstname string `json:"firstname"`
	Lastname  string `json:"lastname"`
	Role      string `json:"role"`
}

type ClubMemberRolePatchDto struct {
	Role string `json:"role"`
}
