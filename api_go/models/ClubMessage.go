package models

import "time"

type ClubMessageCandidate struct {
	UserID      string
	DisplayName string
	Email       string
}

type ClubChatSummary struct {
	ChatID           string
	ClubID           string
	OtherUserID      string
	OtherDisplayName string
	OtherEmail       string
	LastMessage      string
	LastSenderUserID string
	LastMessageAt    *time.Time
	UnreadCount      int
}

type UnreadByClub struct {
	ClubID   string
	ClubName string
	Unread   int
}

type UnreadSummary struct {
	Total  int
	ByClub []UnreadByClub
}

type ClubChatMessage struct {
	ID                string
	ChatID            string
	SenderUserID      string
	SenderDisplayName string
	SenderEmail       string
	Content           string
	CreatedAt         *time.Time
}
