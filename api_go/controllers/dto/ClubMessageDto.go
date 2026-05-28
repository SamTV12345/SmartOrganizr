package dto

type ClubMessageCandidateDto struct {
	UserID      string `json:"user_id"      validate:"required"`
	DisplayName string `json:"display_name" validate:"required"`
	Email       string `json:"email"        validate:"required"`
}

type ClubChatSummaryDto struct {
	ChatID           string `json:"chat_id"             validate:"required"`
	ClubID           string `json:"club_id"             validate:"required"`
	OtherUserID      string `json:"other_user_id"       validate:"required"`
	OtherDisplayName string `json:"other_display_name"  validate:"required"`
	OtherEmail       string `json:"other_email"         validate:"required"`
	LastMessage      string `json:"last_message"        validate:"required"`
	LastSenderUserID string `json:"last_sender_user_id" validate:"required"`
	LastMessageAt    string `json:"last_message_at"     validate:"required"`
	UnreadCount      int    `json:"unread_count"`
}

type UnreadByClubDto struct {
	ClubID   string `json:"clubId"`
	ClubName string `json:"clubName"`
	Unread   int    `json:"unread"`
}

type UnreadSummaryDto struct {
	Total  int               `json:"total"`
	ByClub []UnreadByClubDto `json:"byClub"`
}

type ClubChatMessageDto struct {
	ID                string `json:"id"                  validate:"required"`
	ChatID            string `json:"chat_id"             validate:"required"`
	SenderUserID      string `json:"sender_user_id"      validate:"required"`
	SenderDisplayName string `json:"sender_display_name" validate:"required"`
	SenderEmail       string `json:"sender_email"        validate:"required"`
	Content           string `json:"content"             validate:"required"`
	CreatedAt         string `json:"created_at"          validate:"required"`
}

type ClubChatCreateDto struct {
	RecipientUserID string `json:"recipient_user_id" validate:"required"`
	Content         string `json:"content"           validate:"required"`
}

type ClubChatPostMessageDto struct {
	Content string `json:"content" validate:"required"`
}

type ClubChatCreatedDto struct {
	ChatID string `json:"chat_id" validate:"required"`
}
