package dto

type ClubPermissionsDto struct {
	Role            string          `json:"role"               validate:"required"`
	CanManageRoles  bool            `json:"can_manage_roles"   validate:"required"`
	CanInviteMember bool            `json:"can_invite_members" validate:"required"`
	SectionWrite    map[string]bool `json:"section_write"      validate:"required"`
}
