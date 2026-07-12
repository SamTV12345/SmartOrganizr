package dto

type ClubMemberDto struct {
	UserID     string `json:"user_id"    validate:"required"`
	Username   string `json:"username"   validate:"required"`
	Email      string `json:"email"      validate:"required"`
	Firstname  string `json:"firstname"  validate:"required"`
	Lastname   string `json:"lastname"   validate:"required"`
	Role       string `json:"role"       validate:"required"`
	Authorized bool   `json:"authorized"`
}

type ClubMemberRolePatchDto struct {
	Role string `json:"role" validate:"required"`
}

type ClubMemberAuthorizedPatchDto struct {
	Authorized *bool `json:"authorized" validate:"required"`
}
