package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/models"
	"api_go/service"
	"github.com/gofiber/fiber/v3"
	"time"
)

// GetClubMessageCandidates godoc
// @Summary  List members who can be chatted with
// @Tags     messages
// @Produce  json
// @Param    clubId  path  string  true  "Club ID"
// @Success  200     {array}  dto.ClubMessageCandidateDto
// @Router   /v1/clubs/{clubId}/messages/candidates [get]
func GetClubMessageCandidates(c fiber.Ctx) error {
	messageService := GetLocal[service.MessageService](c, constants.MessageService)
	requesterID := GetLocal[string](c, "userId")
	clubID := c.Params("clubId")

	candidates, err := messageService.GetCandidates(clubID, requesterID)
	if err != nil {
		return fiber.NewError(fiber.StatusForbidden, err.Error())
	}

	result := make([]dto.ClubMessageCandidateDto, 0, len(candidates))
	for _, candidate := range candidates {
		result = append(result, dto.ClubMessageCandidateDto{
			UserID:      candidate.UserID,
			DisplayName: candidate.DisplayName,
			Email:       candidate.Email,
		})
	}
	return c.JSON(result)
}

// GetClubChats godoc
// @Summary  List the user's chats in a club
// @Tags     messages
// @Produce  json
// @Param    clubId  path  string  true  "Club ID"
// @Success  200     {array}  dto.ClubChatSummaryDto
// @Router   /v1/clubs/{clubId}/messages/chats [get]
func GetClubChats(c fiber.Ctx) error {
	messageService := GetLocal[service.MessageService](c, constants.MessageService)
	requesterID := GetLocal[string](c, "userId")
	clubID := c.Params("clubId")

	chats, err := messageService.GetChats(clubID, requesterID)
	if err != nil {
		return fiber.NewError(fiber.StatusForbidden, err.Error())
	}
	return c.JSON(mapChatSummaries(chats))
}

// CreateClubChat godoc
// @Summary  Start a new chat with a recipient
// @Tags     messages
// @Accept   json
// @Produce  json
// @Param    clubId  path  string                   true  "Club ID"
// @Param    body    body  dto.ClubChatCreateDto    true  "New chat payload"
// @Success  200     {object} dto.ClubChatCreatedDto
// @Router   /v1/clubs/{clubId}/messages/chats [post]
func CreateClubChat(c fiber.Ctx) error {
	messageService := GetLocal[service.MessageService](c, constants.MessageService)
	requesterID := GetLocal[string](c, "userId")
	clubID := c.Params("clubId")

	var chatCreate dto.ClubChatCreateDto
	if err := c.Bind().Body(&chatCreate); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	chatID, err := messageService.CreateChat(clubID, requesterID, chatCreate.RecipientUserID, chatCreate.Content)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(dto.ClubChatCreatedDto{ChatID: chatID})
}

// GetClubChatMessages godoc
// @Summary  List messages in a chat
// @Tags     messages
// @Produce  json
// @Param    clubId  path  string  true  "Club ID"
// @Param    chatId  path  string  true  "Chat ID"
// @Success  200     {array}  dto.ClubChatMessageDto
// @Router   /v1/clubs/{clubId}/messages/chats/{chatId} [get]
func GetClubChatMessages(c fiber.Ctx) error {
	messageService := GetLocal[service.MessageService](c, constants.MessageService)
	requesterID := GetLocal[string](c, "userId")
	clubID := c.Params("clubId")
	chatID := c.Params("chatId")

	messages, err := messageService.GetChatMessages(clubID, chatID, requesterID)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(mapChatMessages(messages))
}

// PostClubChatMessage godoc
// @Summary  Append a message to a chat
// @Tags     messages
// @Accept   json
// @Param    clubId  path  string                       true  "Club ID"
// @Param    chatId  path  string                       true  "Chat ID"
// @Param    body    body  dto.ClubChatPostMessageDto   true  "Message payload"
// @Success  204
// @Router   /v1/clubs/{clubId}/messages/chats/{chatId} [post]
func PostClubChatMessage(c fiber.Ctx) error {
	messageService := GetLocal[service.MessageService](c, constants.MessageService)
	requesterID := GetLocal[string](c, "userId")
	clubID := c.Params("clubId")
	chatID := c.Params("chatId")

	var postMessage dto.ClubChatPostMessageDto
	if err := c.Bind().Body(&postMessage); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	if err := messageService.PostMessage(clubID, chatID, requesterID, postMessage.Content); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func mapChatSummaries(chats []models.ClubChatSummary) []dto.ClubChatSummaryDto {
	items := make([]dto.ClubChatSummaryDto, 0, len(chats))
	for _, chat := range chats {
		items = append(items, dto.ClubChatSummaryDto{
			ChatID:           chat.ChatID,
			ClubID:           chat.ClubID,
			OtherUserID:      chat.OtherUserID,
			OtherDisplayName: chat.OtherDisplayName,
			OtherEmail:       chat.OtherEmail,
			LastMessage:      chat.LastMessage,
			LastSenderUserID: chat.LastSenderUserID,
			LastMessageAt:    formatNullableTime(chat.LastMessageAt),
			UnreadCount:      chat.UnreadCount,
		})
	}
	return items
}

func mapChatMessages(messages []models.ClubChatMessage) []dto.ClubChatMessageDto {
	items := make([]dto.ClubChatMessageDto, 0, len(messages))
	for _, message := range messages {
		items = append(items, dto.ClubChatMessageDto{
			ID:                message.ID,
			ChatID:            message.ChatID,
			SenderUserID:      message.SenderUserID,
			SenderDisplayName: message.SenderDisplayName,
			SenderEmail:       message.SenderEmail,
			Content:           message.Content,
			CreatedAt:         formatNullableTime(message.CreatedAt),
		})
	}
	return items
}

func formatNullableTime(value *time.Time) string {
	if value == nil {
		return ""
	}
	return value.Format(time.RFC3339)
}
