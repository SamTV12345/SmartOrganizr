export type ClubPermissions = {
    role: string;
    can_manage_roles: boolean;
    can_invite_members: boolean;
    section_write: Record<string, boolean>;
};

