package dto

type ClubMemberDto struct {
	UserID    string `json:"user_id"   validate:"required"`
	Username  string `json:"username"  validate:"required"`
	Email     string `json:"email"     validate:"required"`
	Firstname string `json:"firstname" validate:"required"`
	Lastname  string `json:"lastname"  validate:"required"`
	Role      string `json:"role"      validate:"required"`
}

type ClubMemberRolePatchDto struct {
	Role string `json:"role" validate:"required"`
}
