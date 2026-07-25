package dto

type ClubPermissionsDto struct {
	Role            string `json:"role"               validate:"required"`
	CanManageRoles  bool   `json:"can_manage_roles"   validate:"required"`
	CanInviteMember bool   `json:"can_invite_members" validate:"required"`
	CanManageEvents bool   `json:"can_manage_events"`
	// CanManageSectionEvents marks a Registerführer: allowed to manage the
	// events of their own section only. MySectionID names that section.
	CanManageSectionEvents bool            `json:"can_manage_section_events"`
	MySectionID            string          `json:"my_section_id"`
	SectionWrite           map[string]bool `json:"section_write"      validate:"required"`
}
