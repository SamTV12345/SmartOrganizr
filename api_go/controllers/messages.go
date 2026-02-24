package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/models"
	"api_go/service"
	"github.com/gofiber/fiber/v2"
	"time"
)

func GetClubMessageCandidates(c *fiber.Ctx) error {
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

func GetClubChats(c *fiber.Ctx) error {
	messageService := GetLocal[service.MessageService](c, constants.MessageService)
	requesterID := GetLocal[string](c, "userId")
	clubID := c.Params("clubId")

	chats, err := messageService.GetChats(clubID, requesterID)
	if err != nil {
		return fiber.NewError(fiber.StatusForbidden, err.Error())
	}
	return c.JSON(mapChatSummaries(chats))
}

func CreateClubChat(c *fiber.Ctx) error {
	messageService := GetLocal[service.MessageService](c, constants.MessageService)
	requesterID := GetLocal[string](c, "userId")
	clubID := c.Params("clubId")

	var chatCreate dto.ClubChatCreateDto
	if err := c.BodyParser(&chatCreate); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	chatID, err := messageService.CreateChat(clubID, requesterID, chatCreate.RecipientUserID, chatCreate.Content)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(dto.ClubChatCreatedDto{ChatID: chatID})
}

func GetClubChatMessages(c *fiber.Ctx) error {
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

func PostClubChatMessage(c *fiber.Ctx) error {
	messageService := GetLocal[service.MessageService](c, constants.MessageService)
	requesterID := GetLocal[string](c, "userId")
	clubID := c.Params("clubId")
	chatID := c.Params("chatId")

	var postMessage dto.ClubChatPostMessageDto
	if err := c.BodyParser(&postMessage); err != nil {
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
