export type ClubPermissions = {
    role: string;
    can_manage_roles: boolean;
    can_invite_members: boolean;
    can_manage_events?: boolean;
    /** Registerführer: may manage the events of my_section_id only. */
    can_manage_section_events?: boolean;
    my_section_id?: string;
    section_write: Record<string, boolean>;
};

