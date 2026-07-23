package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/service"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
)

func clubPollService(c fiber.Ctx) *service.ClubPollService {
	svc := GetLocal[service.ClubPollService](c, constants.ClubPollService)
	return &svc
}

// ListClubPolls godoc
// @Summary  List a club's polls with results
// @Tags     club-polls
// @Produce  json
// @Param    clubId  path  string  true  "Club ID"
// @Success  200     {array}  dto.ClubPollDto
// @Router   /v1/clubs/{clubId}/polls [get]
func ListClubPolls(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	polls, err := clubPollService(c).List(c.Params("clubId"), userID)
	if err != nil {
		log.Errorf("list polls: %v", err)
		return mapServiceError(err)
	}
	return c.JSON(polls)
}

// CreateClubPoll godoc
// @Summary  Create a poll (manager only)
// @Tags     club-polls
// @Accept   json
// @Produce  json
// @Param    clubId  path  string                true  "Club ID"
// @Param    body    body  dto.ClubPollCreateDto  true  "Poll payload"
// @Success  200     {object} dto.ClubPollDto
// @Router   /v1/clubs/{clubId}/polls [post]
func CreateClubPoll(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	var body dto.ClubPollCreateDto
	if err := c.Bind().Body(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	poll, err := clubPollService(c).Create(c.Params("clubId"), userID, body)
	if err != nil {
		log.Errorf("create poll: %v", err)
		return mapServiceError(err)
	}
	return c.JSON(poll)
}

// VoteClubPoll godoc
// @Summary  Cast or replace the caller's vote
// @Tags     club-polls
// @Accept   json
// @Param    clubId  path  string             true  "Club ID"
// @Param    pollId  path  string             true  "Poll ID"
// @Param    body    body  dto.ClubPollVoteDto true  "Ballot"
// @Success  204
// @Router   /v1/clubs/{clubId}/polls/{pollId}/vote [post]
func VoteClubPoll(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	var body dto.ClubPollVoteDto
	if err := c.Bind().Body(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	if err := clubPollService(c).Vote(c.Params("clubId"), userID, c.Params("pollId"), body); err != nil {
		log.Errorf("vote poll: %v", err)
		return mapServiceError(err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// CloseClubPoll godoc
// @Summary  Close a poll (manager only)
// @Tags     club-polls
// @Param    clubId  path  string  true  "Club ID"
// @Param    pollId  path  string  true  "Poll ID"
// @Success  204
// @Router   /v1/clubs/{clubId}/polls/{pollId}/close [post]
func CloseClubPoll(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	if err := clubPollService(c).Close(c.Params("clubId"), userID, c.Params("pollId")); err != nil {
		log.Errorf("close poll: %v", err)
		return mapServiceError(err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// DeleteClubPoll godoc
// @Summary  Delete a poll (manager only)
// @Tags     club-polls
// @Param    clubId  path  string  true  "Club ID"
// @Param    pollId  path  string  true  "Poll ID"
// @Success  204
// @Router   /v1/clubs/{clubId}/polls/{pollId} [delete]
func DeleteClubPoll(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	if err := clubPollService(c).Delete(c.Params("clubId"), userID, c.Params("pollId")); err != nil {
		log.Errorf("delete poll: %v", err)
		return mapServiceError(err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}
