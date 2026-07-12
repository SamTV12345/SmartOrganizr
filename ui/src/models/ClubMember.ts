export type ClubMember = {
    user_id: string;
    username: string;
    email: string;
    firstname: string;
    lastname: string;
    role: string;
    authorized: boolean;
    sectionId?: string;
    sectionName?: string;
    sectionLeader: boolean;
};

