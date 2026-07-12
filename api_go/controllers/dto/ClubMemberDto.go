package dto

type ClubMemberDto struct {
	UserID        string `json:"user_id"    validate:"required"`
	Username      string `json:"username"   validate:"required"`
	Email         string `json:"email"      validate:"required"`
	Firstname     string `json:"firstname"  validate:"required"`
	Lastname      string `json:"lastname"   validate:"required"`
	Role          string `json:"role"       validate:"required"`
	Authorized    bool   `json:"authorized"`
	SectionID     string `json:"sectionId,omitempty"`
	SectionName   string `json:"sectionName,omitempty"`
	SectionLeader bool   `json:"sectionLeader"`
}

type ClubMemberRolePatchDto struct {
	Role string `json:"role" validate:"required"`
}

type ClubMemberAuthorizedPatchDto struct {
	Authorized *bool `json:"authorized" validate:"required"`
}

type ClubMemberSectionPatchDto struct {
	// SectionID nil/empty removes the member from any section.
	SectionID     *string `json:"sectionId"`
	SectionLeader bool    `json:"sectionLeader"`
}

type ClubSectionDto struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	MemberCount int    `json:"memberCount"`
}

type ClubSectionUpsertDto struct {
	Name string `json:"name" validate:"required"`
}
