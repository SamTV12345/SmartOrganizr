package dto

type ClubPermissionsDto struct {
	Role            string          `json:"role"`
	CanManageRoles  bool            `json:"can_manage_roles"`
	CanInviteMember bool            `json:"can_invite_members"`
	SectionWrite    map[string]bool `json:"section_write"`
}
