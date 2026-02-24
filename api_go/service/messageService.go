package service

import (
	"api_go/db"
	"api_go/models"
	"context"
	"database/sql"
	"errors"
	"github.com/google/uuid"
	"strings"
	"time"
)

type MessageService struct {
	queries *db.Queries
	ctx     context.Context
}

func NewMessageService(queries *db.Queries) MessageService {
	return MessageService{
		queries: queries,
		ctx:     context.Background(),
	}
}

func (m *MessageService) GetCandidates(clubID string, requesterID string) ([]models.ClubMessageCandidate, error) {
	if err := m.ensureMessagingAllowed(clubID, requesterID); err != nil {
		return nil, err
	}

	rows, err := m.queries.ListClubChatCandidates(m.ctx, db.ListClubChatCandidatesParams{
		ClubID:      clubID,
		RequesterID: requesterID,
	})
	if err != nil {
		return nil, err
	}

	items := make([]models.ClubMessageCandidate, 0, len(rows))
	for _, row := range rows {
		items = append(items, models.ClubMessageCandidate{
			UserID:      row.UserID,
			DisplayName: buildDisplayName(row.Firstname.String, row.Lastname.String, row.Username.String, row.UserID),
			Email:       row.Email.String,
		})
	}
	return items, nil
}

func (m *MessageService) GetChats(clubID string, requesterID string) ([]models.ClubChatSummary, error) {
	if err := m.ensureMessagingAllowed(clubID, requesterID); err != nil {
		return nil, err
	}

	rows, err := m.queries.ListClubChatsForUser(m.ctx, db.ListClubChatsForUserParams{
		RequesterID: requesterID,
		ClubID:      clubID,
	})
	if err != nil {
		return nil, err
	}

	items := make([]models.ClubChatSummary, 0, len(rows))
	for _, row := range rows {
		var lastAt *time.Time
		if row.LastMessageAt.Valid {
			t := row.LastMessageAt.Time
			lastAt = &t
		}

		items = append(items, models.ClubChatSummary{
			ChatID:           row.ChatID,
			ClubID:           row.ClubID,
			OtherUserID:      row.OtherUserID,
			OtherDisplayName: buildDisplayName(row.OtherFirstname.String, row.OtherLastname.String, row.OtherUsername.String, row.OtherUserID),
			OtherEmail:       row.OtherEmail.String,
			LastMessage:      row.LastMessage.String,
			LastSenderUserID: row.LastSenderUserID.String,
			LastMessageAt:    lastAt,
		})
	}
	return items, nil
}

func (m *MessageService) CreateChat(clubID string, requesterID string, recipientUserID string, content string) (string, error) {
	if err := m.ensureMessagingAllowed(clubID, requesterID); err != nil {
		return "", err
	}

	recipientID := strings.TrimSpace(recipientUserID)
	if recipientID == "" {
		return "", errors.New("recipient user is required")
	}
	if recipientID == requesterID {
		return "", errors.New("you cannot message yourself")
	}

	if _, err := m.queries.FindClubMemberByClubAndUser(m.ctx, db.FindClubMemberByClubAndUserParams{
		ClubID: clubID,
		UserID: recipientID,
	}); err != nil {
		return "", errors.New("recipient is not part of this club")
	}

	userA, userB := normalizeChatUsers(requesterID, recipientID)
	chat, err := m.queries.FindClubChatByUsers(m.ctx, db.FindClubChatByUsersParams{
		ClubID:  clubID,
		UserAID: userA,
		UserBID: userB,
	})
	if err != nil && err != sql.ErrNoRows {
		return "", err
	}

	chatID := chat.ID
	if err == sql.ErrNoRows {
		generatedChatID, genErr := uuid.NewRandom()
		if genErr != nil {
			return "", genErr
		}
		chatID = generatedChatID.String()
		if createErr := m.queries.CreateClubChat(m.ctx, db.CreateClubChatParams{
			ID:      chatID,
			ClubID:  clubID,
			UserAID: userA,
			UserBID: userB,
		}); createErr != nil {
			return "", createErr
		}
	}

	normalizedContent := strings.TrimSpace(content)
	if normalizedContent != "" {
		if err := m.createMessage(chatID, requesterID, normalizedContent); err != nil {
			return "", err
		}
	}

	return chatID, nil
}

func (m *MessageService) GetChatMessages(clubID string, chatID string, requesterID string) ([]models.ClubChatMessage, error) {
	if err := m.ensureMessagingAllowed(clubID, requesterID); err != nil {
		return nil, err
	}
	if err := m.ensureChatAccessible(clubID, chatID, requesterID); err != nil {
		return nil, err
	}

	rows, err := m.queries.ListClubChatMessages(m.ctx, chatID)
	if err != nil {
		return nil, err
	}

	items := make([]models.ClubChatMessage, 0, len(rows))
	for _, row := range rows {
		var createdAt *time.Time
		if row.CreatedAt.Valid {
			t := row.CreatedAt.Time
			createdAt = &t
		}
		items = append(items, models.ClubChatMessage{
			ID:                row.ID,
			ChatID:            row.ChatID,
			SenderUserID:      row.SenderUserID,
			SenderDisplayName: buildDisplayName(row.SenderFirstname.String, row.SenderLastname.String, row.SenderUsername.String, row.SenderUserID),
			SenderEmail:       row.SenderEmail.String,
			Content:           row.Content,
			CreatedAt:         createdAt,
		})
	}
	return items, nil
}

func (m *MessageService) PostMessage(clubID string, chatID string, requesterID string, content string) error {
	if err := m.ensureMessagingAllowed(clubID, requesterID); err != nil {
		return err
	}
	if err := m.ensureChatAccessible(clubID, chatID, requesterID); err != nil {
		return err
	}

	normalizedContent := strings.TrimSpace(content)
	if normalizedContent == "" {
		return errors.New("message content is required")
	}
	return m.createMessage(chatID, requesterID, normalizedContent)
}

func (m *MessageService) createMessage(chatID string, senderUserID string, content string) error {
	messageID, err := uuid.NewRandom()
	if err != nil {
		return err
	}
	return m.queries.CreateClubChatMessage(m.ctx, db.CreateClubChatMessageParams{
		ID:           messageID.String(),
		ChatID:       chatID,
		SenderUserID: senderUserID,
		Content:      content,
	})
}

func (m *MessageService) ensureMessagingAllowed(clubID string, requesterID string) error {
	if _, err := m.queries.FindClubMemberByClubAndUser(m.ctx, db.FindClubMemberByClubAndUserParams{
		ClubID: clubID,
		UserID: requesterID,
	}); err != nil {
		return errors.New("no club access")
	}

	clubWithAddress, err := m.queries.FindClubByID(m.ctx, clubID)
	if err != nil {
		return err
	}
	if !clubWithAddress.Club.MembersCanSendMessages {
		return errors.New("members are not allowed to send messages in this club")
	}
	return nil
}

func (m *MessageService) ensureChatAccessible(clubID string, chatID string, requesterID string) error {
	chat, err := m.queries.FindClubChatByID(m.ctx, chatID)
	if err != nil {
		return errors.New("chat not found")
	}
	if chat.ClubID != clubID {
		return errors.New("chat does not belong to this club")
	}
	if chat.UserAID != requesterID && chat.UserBID != requesterID {
		return errors.New("you are not part of this chat")
	}
	return nil
}

func normalizeChatUsers(userOne string, userTwo string) (string, string) {
	if strings.Compare(userOne, userTwo) <= 0 {
		return userOne, userTwo
	}
	return userTwo, userOne
}

func buildDisplayName(firstname string, lastname string, username string, fallback string) string {
	fullName := strings.TrimSpace(strings.TrimSpace(firstname) + " " + strings.TrimSpace(lastname))
	if fullName != "" {
		return fullName
	}
	if strings.TrimSpace(username) != "" {
		return strings.TrimSpace(username)
	}
	return fallback
}
