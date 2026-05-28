package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/service"
	"bufio"
	"encoding/json"
	"time"

	"github.com/gofiber/fiber/v3"
)

// StreamNotifications godoc
// @Summary  Server-Sent Events stream of notifications for the current user
// @Tags     notifications
// @Produce  text/event-stream
// @Success  200
// @Router   /v1/notifications/stream [get]
func StreamNotifications(c fiber.Ctx) error {
	hub := GetLocal[*service.NotificationHub](c, constants.NotificationHub)
	userID := GetLocal[string](c, "userId")
	events, unsubscribe := hub.Subscribe(userID)

	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")

	return c.SendStreamWriter(func(w *bufio.Writer) {
		defer unsubscribe()
		if _, err := w.WriteString(": connected\n\n"); err != nil {
			return
		}
		if err := w.Flush(); err != nil {
			return
		}

		ticker := time.NewTicker(25 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case event, ok := <-events:
				if !ok {
					return
				}
				payload, err := json.Marshal(event)
				if err != nil {
					continue
				}
				if _, err := w.WriteString("data: " + string(payload) + "\n\n"); err != nil {
					return
				}
				if err := w.Flush(); err != nil {
					return
				}
			case <-ticker.C:
				// keepalive comment; a write error means the client disconnected.
				if _, err := w.WriteString(": keepalive\n\n"); err != nil {
					return
				}
				if err := w.Flush(); err != nil {
					return
				}
			}
		}
	})
}

// GetUnreadSummary godoc
// @Summary  Total and per-club unread message counts for the current user
// @Tags     notifications
// @Produce  json
// @Success  200  {object} dto.UnreadSummaryDto
// @Router   /v1/notifications/unread-summary [get]
func GetUnreadSummary(c fiber.Ctx) error {
	messageService := GetLocal[service.MessageService](c, constants.MessageService)
	requesterID := GetLocal[string](c, "userId")

	summary, err := messageService.UnreadSummary(requesterID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	byClub := make([]dto.UnreadByClubDto, 0, len(summary.ByClub))
	for _, item := range summary.ByClub {
		byClub = append(byClub, dto.UnreadByClubDto{
			ClubID:   item.ClubID,
			ClubName: item.ClubName,
			Unread:   item.Unread,
		})
	}
	return c.JSON(dto.UnreadSummaryDto{Total: summary.Total, ByClub: byClub})
}

// MarkChatRead godoc
// @Summary  Mark a chat as read up to now
// @Tags     notifications
// @Param    clubId  path  string  true  "Club ID"
// @Param    chatId  path  string  true  "Chat ID"
// @Success  204
// @Router   /v1/clubs/{clubId}/messages/chats/{chatId}/read [patch]
func MarkChatRead(c fiber.Ctx) error {
	messageService := GetLocal[service.MessageService](c, constants.MessageService)
	requesterID := GetLocal[string](c, "userId")
	clubID := c.Params("clubId")
	chatID := c.Params("chatId")

	if err := messageService.MarkRead(clubID, chatID, requesterID); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.SendStatus(fiber.StatusNoContent)
}
