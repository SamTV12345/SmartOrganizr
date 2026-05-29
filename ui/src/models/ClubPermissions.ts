export type ClubPermissions = {
    role: string;
    can_manage_roles: boolean;
    can_invite_members: boolean;
    can_manage_events?: boolean;
    section_write: Record<string, boolean>;
};

