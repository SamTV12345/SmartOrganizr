package controllers

import (
	"api_go/constants"
	"api_go/service"
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
)

type aiChatSessionDto struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type aiChatMessageDto struct {
	ID        int64     `json:"id"`
	Role      string    `json:"role"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"createdAt"`
}

type aiChatMessageRequest struct {
	Message string `json:"message"`
}

// configuredAiChat returns the chat service or nil when AI is not
// configured — callers must answer 503 on nil (same contract as
// PostIdentifyMusic).
func configuredAiChat(c fiber.Ctx) *service.AIChatService {
	svc := GetLocal[*service.AIChatService](c, constants.AIChatService)
	if svc == nil || svc.AI == nil || !svc.AI.IsConfigured() {
		return nil
	}
	return svc
}

func aiNotConfigured(c fiber.Ctx) error {
	return c.Status(503).JSON(fiber.Map{"error": "AI chat is not configured on this server"})
}

func GetAiChatSessions(c fiber.Ctx) error {
	svc := configuredAiChat(c)
	if svc == nil {
		return aiNotConfigured(c)
	}
	userID := GetLocal[string](c, "userId")
	sessions, err := svc.ListSessions(userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	out := make([]aiChatSessionDto, 0, len(sessions))
	for _, s := range sessions {
		out = append(out, aiChatSessionDto{ID: s.ID, Title: s.Title, UpdatedAt: s.UpdatedAt})
	}
	return c.JSON(out)
}

func PostAiChatSession(c fiber.Ctx) error {
	svc := configuredAiChat(c)
	if svc == nil {
		return aiNotConfigured(c)
	}
	userID := GetLocal[string](c, "userId")
	sess, err := svc.CreateSession(userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(aiChatSessionDto{ID: sess.ID, Title: sess.Title, UpdatedAt: sess.UpdatedAt})
}

func GetAiChatMessages(c fiber.Ctx) error {
	svc := configuredAiChat(c)
	if svc == nil {
		return aiNotConfigured(c)
	}
	userID := GetLocal[string](c, "userId")
	messages, err := svc.ListMessages(userID, c.Params("sessionId"))
	if errors.Is(err, service.ErrChatSessionNotFound) {
		return c.Status(404).JSON(fiber.Map{"error": "session not found"})
	}
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	out := make([]aiChatMessageDto, 0, len(messages))
	for _, m := range messages {
		out = append(out, aiChatMessageDto{ID: m.ID, Role: m.Role, Content: m.Content, CreatedAt: m.CreatedAt})
	}
	return c.JSON(out)
}

func DeleteAiChatSession(c fiber.Ctx) error {
	svc := configuredAiChat(c)
	if svc == nil {
		return aiNotConfigured(c)
	}
	userID := GetLocal[string](c, "userId")
	err := svc.DeleteSession(userID, c.Params("sessionId"))
	if errors.Is(err, service.ErrChatSessionNotFound) {
		return c.Status(404).JSON(fiber.Map{"error": "session not found"})
	}
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"ok": true})
}

func PostAiChatMessage(c fiber.Ctx) error {
	svc := configuredAiChat(c)
	if svc == nil {
		return aiNotConfigured(c)
	}
	userID := GetLocal[string](c, "userId")
	sessionID := c.Params("sessionId")

	var req aiChatMessageRequest
	if err := c.Bind().Body(&req); err != nil {
		return err
	}
	if strings.TrimSpace(req.Message) == "" {
		return c.Status(400).JSON(fiber.Map{"error": "message is required"})
	}

	// Persist + validate BEFORE switching to the stream so ownership and
	// DB errors still surface as proper HTTP status codes.
	history, err := svc.PrepareUserMessage(userID, sessionID, req.Message)
	if errors.Is(err, service.ErrChatSessionNotFound) {
		return c.Status(404).JSON(fiber.Map{"error": "session not found"})
	}
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")

	return c.SendStreamWriter(func(w *bufio.Writer) {
		// Client disconnects surface as write/flush errors; cancel() then
		// aborts the upstream AI call instead of streaming into the void.
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()
		emit := func(ev service.ChatEvent) {
			payload, err := json.Marshal(ev.Data)
			if err != nil {
				return
			}
			if _, err := w.WriteString("event: " + ev.Type + "\ndata: " + string(payload) + "\n\n"); err != nil {
				cancel()
				return
			}
			if err := w.Flush(); err != nil {
				cancel()
			}
		}
		finalText, err := svc.RunChat(ctx, userID, history, emit)
		if err != nil {
			emit(service.ChatEvent{Type: "error", Data: map[string]any{"message": "AI request failed"}})
			return
		}
		if err := svc.PersistAssistantMessage(sessionID, finalText); err != nil {
			emit(service.ChatEvent{Type: "error", Data: map[string]any{"message": "failed to store reply"}})
			return
		}
		emit(service.ChatEvent{Type: "done", Data: map[string]any{}})
	})
}
