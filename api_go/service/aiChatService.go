package service

import (
	"api_go/db"
	"api_go/models"
	"context"
	"errors"

	"github.com/google/uuid"
)

var ErrChatSessionNotFound = errors.New("chat session not found")

const sessionTitleMaxLen = 80
const maxHistoryMessages = 20

// NoteSearcher abstracts the note search so the agent loop can be
// unit-tested without a database. NoteService satisfies it.
type NoteSearcher interface {
	LoadAllNotes(userId string, page *int, nameStr *string) ([]models.Note, int, error)
}

// AIChatService owns chat sessions/messages and runs the function-calling
// agent loop (see aiChatAgent.go) against the configured AI provider.
type AIChatService struct {
	Queries    *db.Queries
	Ctx        context.Context
	AI         *AIService
	NoteSearch NoteSearcher
}

func (s *AIChatService) CreateSession(userID string) (db.AiChatSession, error) {
	id := uuid.NewString()
	err := s.Queries.CreateAiChatSession(s.Ctx, db.CreateAiChatSessionParams{
		ID:     id,
		UserFk: userID,
		Title:  "",
	})
	if err != nil {
		return db.AiChatSession{}, err
	}
	return s.Queries.FindAiChatSessionById(s.Ctx, id)
}

func (s *AIChatService) ListSessions(userID string) ([]db.AiChatSession, error) {
	return s.Queries.FindAiChatSessionsByUser(s.Ctx, userID)
}

// getOwnedSession returns the session only when it exists AND belongs to
// userID; both failure cases collapse into ErrChatSessionNotFound so the
// API never leaks whether a foreign session id exists.
func (s *AIChatService) getOwnedSession(userID, sessionID string) (db.AiChatSession, error) {
	sess, err := s.Queries.FindAiChatSessionById(s.Ctx, sessionID)
	if err != nil || sess.UserFk != userID {
		return db.AiChatSession{}, ErrChatSessionNotFound
	}
	return sess, nil
}

func (s *AIChatService) ListMessages(userID, sessionID string) ([]db.AiChatMessage, error) {
	if _, err := s.getOwnedSession(userID, sessionID); err != nil {
		return nil, err
	}
	return s.Queries.FindAiChatMessagesBySession(s.Ctx, sessionID)
}

func (s *AIChatService) DeleteSession(userID, sessionID string) error {
	if _, err := s.getOwnedSession(userID, sessionID); err != nil {
		return err
	}
	return s.Queries.DeleteAiChatSession(s.Ctx, sessionID)
}

// PrepareUserMessage validates ownership, persists the user message, sets
// the session title on first message and returns the history (last
// maxHistoryMessages, ending with the new user message) for the agent loop.
func (s *AIChatService) PrepareUserMessage(userID, sessionID, message string) ([]ChatMessage, error) {
	sess, err := s.getOwnedSession(userID, sessionID)
	if err != nil {
		return nil, err
	}
	err = s.Queries.CreateAiChatMessage(s.Ctx, db.CreateAiChatMessageParams{
		SessionFk: sessionID,
		Role:      "user",
		Content:   message,
	})
	if err != nil {
		return nil, err
	}
	if sess.Title == "" {
		title := message
		if runes := []rune(title); len(runes) > sessionTitleMaxLen {
			title = string(runes[:sessionTitleMaxLen])
		}
		_ = s.Queries.UpdateAiChatSessionTitle(s.Ctx, db.UpdateAiChatSessionTitleParams{
			Title: title,
			ID:    sessionID,
		})
	}
	_ = s.Queries.TouchAiChatSession(s.Ctx, sessionID)

	rows, err := s.Queries.FindAiChatMessagesBySession(s.Ctx, sessionID)
	if err != nil {
		return nil, err
	}
	if len(rows) > maxHistoryMessages {
		rows = rows[len(rows)-maxHistoryMessages:]
	}
	history := make([]ChatMessage, 0, len(rows))
	for _, r := range rows {
		history = append(history, ChatMessage{Role: r.Role, Content: r.Content})
	}
	return history, nil
}

func (s *AIChatService) PersistAssistantMessage(sessionID, content string) error {
	err := s.Queries.CreateAiChatMessage(s.Ctx, db.CreateAiChatMessageParams{
		SessionFk: sessionID,
		Role:      "assistant",
		Content:   content,
	})
	if err != nil {
		return err
	}
	return s.Queries.TouchAiChatSession(s.Ctx, sessionID)
}
