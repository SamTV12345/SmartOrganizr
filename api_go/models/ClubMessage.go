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
