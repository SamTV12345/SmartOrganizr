export type ClubMessageCandidate = {
    user_id: string;
    display_name: string;
    email: string;
};

export type ClubChatSummary = {
    chat_id: string;
    club_id: string;
    other_user_id: string;
    other_display_name: string;
    other_email: string;
    last_message: string;
    last_sender_user_id: string;
    last_message_at: string;
};

export type ClubChatMessage = {
    id: string;
    chat_id: string;
    sender_user_id: string;
    sender_display_name: string;
    sender_email: string;
    content: string;
    created_at: string;
};

export type ClubChatCreated = {
    chat_id: string;
};
