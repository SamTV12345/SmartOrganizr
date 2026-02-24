package dto

type ClubMessageCandidateDto struct {
	UserID      string `json:"user_id"`
	DisplayName string `json:"display_name"`
	Email       string `json:"email"`
}

type ClubChatSummaryDto struct {
	ChatID           string `json:"chat_id"`
	ClubID           string `json:"club_id"`
	OtherUserID      string `json:"other_user_id"`
	OtherDisplayName string `json:"other_display_name"`
	OtherEmail       string `json:"other_email"`
	LastMessage      string `json:"last_message"`
	LastSenderUserID string `json:"last_sender_user_id"`
	LastMessageAt    string `json:"last_message_at"`
}

type ClubChatMessageDto struct {
	ID                string `json:"id"`
	ChatID            string `json:"chat_id"`
	SenderUserID      string `json:"sender_user_id"`
	SenderDisplayName string `json:"sender_display_name"`
	SenderEmail       string `json:"sender_email"`
	Content           string `json:"content"`
	CreatedAt         string `json:"created_at"`
}

type ClubChatCreateDto struct {
	RecipientUserID string `json:"recipient_user_id"`
	Content         string `json:"content"`
}

type ClubChatPostMessageDto struct {
	Content string `json:"content"`
}

type ClubChatCreatedDto struct {
	ChatID string `json:"chat_id"`
}
