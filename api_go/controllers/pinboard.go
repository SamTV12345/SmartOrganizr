package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/models"
	"api_go/service"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
)

const (
	defaultRecentPinboardLimit = 10
	maxRecentPinboardLimit     = 50
)

// GetClubPinboard godoc
// @Summary  List pinboard posts of a club
// @Tags     pinboard
// @Produce  json
// @Param    clubId  path  string  true  "Club ID"
// @Success  200     {array}  dto.PinboardPostDto
// @Router   /v1/clubs/{clubId}/pinboard [get]
func GetClubPinboard(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	clubID := c.Params("clubId")
	if _, err := requireClubMember(c, clubID, userID); err != nil {
		return err
	}
	pinboardService := GetLocal[service.PinboardService](c, constants.PinboardService)
	posts, err := pinboardService.ListForClub(clubID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(mapPinboardPosts(posts))
}

// CreateClubPinboardPost godoc
// @Summary  Create a pinboard post
// @Tags     pinboard
// @Accept   json
// @Produce  json
// @Param    clubId  path  string                    true  "Club ID"
// @Param    body    body  dto.PinboardPostUpsertDto true  "Post payload"
// @Success  200     {object} dto.PinboardPostDto
// @Router   /v1/clubs/{clubId}/pinboard [post]
func CreateClubPinboardPost(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	clubID := c.Params("clubId")
	if err := requirePinboardWrite(c, clubID, userID); err != nil {
		return err
	}
	body, err := bindPinboardUpsert(c)
	if err != nil {
		return err
	}
	pinboardService := GetLocal[service.PinboardService](c, constants.PinboardService)
	post, err := pinboardService.Create(clubID, userID, body.Title, body.Body, body.Pinned)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(mapPinboardPost(post))
}

// UpdateClubPinboardPost godoc
// @Summary  Update a pinboard post
// @Tags     pinboard
// @Accept   json
// @Produce  json
// @Param    clubId  path  string                    true  "Club ID"
// @Param    postId  path  string                    true  "Post ID"
// @Param    body    body  dto.PinboardPostUpsertDto true  "Post payload"
// @Success  200     {object} dto.PinboardPostDto
// @Router   /v1/clubs/{clubId}/pinboard/{postId} [patch]
func UpdateClubPinboardPost(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	clubID := c.Params("clubId")
	postID := c.Params("postId")
	if err := requirePinboardWrite(c, clubID, userID); err != nil {
		return err
	}
	body, err := bindPinboardUpsert(c)
	if err != nil {
		return err
	}
	pinboardService := GetLocal[service.PinboardService](c, constants.PinboardService)
	post, err := pinboardService.Update(clubID, postID, body.Title, body.Body, body.Pinned)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(mapPinboardPost(post))
}

// DeleteClubPinboardPost godoc
// @Summary  Delete a pinboard post
// @Tags     pinboard
// @Param    clubId  path  string  true  "Club ID"
// @Param    postId  path  string  true  "Post ID"
// @Success  204
// @Router   /v1/clubs/{clubId}/pinboard/{postId} [delete]
func DeleteClubPinboardPost(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	clubID := c.Params("clubId")
	postID := c.Params("postId")
	if err := requirePinboardWrite(c, clubID, userID); err != nil {
		return err
	}
	pinboardService := GetLocal[service.PinboardService](c, constants.PinboardService)
	if err := pinboardService.Delete(clubID, postID); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// GetRecentPinboardForUser godoc
// @Summary  List the most recent pinboard posts across the user's clubs
// @Tags     pinboard
// @Produce  json
// @Param    userId  path   string  true   "User ID"
// @Param    limit   query  int     false  "Max posts (default 10, max 50)"
// @Success  200     {array}  dto.PinboardPostDto
// @Router   /v1/users/{userId}/pinboard/recent [get]
func GetRecentPinboardForUser(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	if c.Params("userId") != userID {
		return fiber.NewError(fiber.StatusForbidden, "forbidden")
	}
	limit := defaultRecentPinboardLimit
	if raw := c.Query("limit"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	if limit > maxRecentPinboardLimit {
		limit = maxRecentPinboardLimit
	}
	pinboardService := GetLocal[service.PinboardService](c, constants.PinboardService)
	posts, err := pinboardService.RecentForUser(userID, int32(limit))
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(mapPinboardPosts(posts))
}

func requireClubMember(c fiber.Ctx, clubID string, userID string) (models.ClubRole, error) {
	memberService := GetLocal[service.ClubMemberService](c, constants.ClubMemberService)
	role, err := memberService.GetRoleInClub(clubID, userID)
	if err != nil {
		return "", fiber.NewError(fiber.StatusForbidden, "no club access")
	}
	return role, nil
}

func requirePinboardWrite(c fiber.Ctx, clubID string, userID string) error {
	role, err := requireClubMember(c, clubID, userID)
	if err != nil {
		return err
	}
	if !canWriteSection(role, "pinnwand") {
		return fiber.NewError(fiber.StatusForbidden, "no write access to pinboard")
	}
	return nil
}

func bindPinboardUpsert(c fiber.Ctx) (dto.PinboardPostUpsertDto, error) {
	var body dto.PinboardPostUpsertDto
	if err := c.Bind().Body(&body); err != nil {
		return body, fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	body.Title = strings.TrimSpace(body.Title)
	body.Body = strings.TrimSpace(body.Body)
	if body.Title == "" {
		return body, fiber.NewError(fiber.StatusBadRequest, "title is required")
	}
	return body, nil
}

func mapPinboardPost(p models.PinboardPost) dto.PinboardPostDto {
	return dto.PinboardPostDto{
		ID:         p.ID,
		ClubID:     p.ClubID,
		ClubName:   p.ClubName,
		AuthorID:   p.AuthorID,
		AuthorName: p.AuthorName,
		Title:      p.Title,
		Body:       p.Body,
		Pinned:     p.Pinned,
		CreatedAt:  p.CreatedAt.Format(time.RFC3339),
		UpdatedAt:  p.UpdatedAt.Format(time.RFC3339),
	}
}

func mapPinboardPosts(posts []models.PinboardPost) []dto.PinboardPostDto {
	items := make([]dto.PinboardPostDto, 0, len(posts))
	for _, p := range posts {
		items = append(items, mapPinboardPost(p))
	}
	return items
}
