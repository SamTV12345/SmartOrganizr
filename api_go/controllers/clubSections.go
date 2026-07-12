package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/service"
	"errors"

	"github.com/gofiber/fiber/v3"
)

func clubSectionService(c fiber.Ctx) *service.ClubSectionService {
	svc := GetLocal[service.ClubSectionService](c, constants.ClubSectionService)
	return &svc
}

func mapSectionError(err error) error {
	switch {
	case errors.Is(err, service.ErrNoClubAccess), errors.Is(err, service.ErrManageForbidden):
		return fiber.NewError(fiber.StatusForbidden, err.Error())
	case errors.Is(err, service.ErrSectionNotFound):
		return fiber.NewError(fiber.StatusNotFound, err.Error())
	case errors.Is(err, service.ErrSectionNameTaken):
		return fiber.NewError(fiber.StatusConflict, err.Error())
	default:
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
}

func sectionToDto(s service.ClubSection) dto.ClubSectionDto {
	return dto.ClubSectionDto{ID: s.ID, Name: s.Name, MemberCount: s.MemberCount}
}

// GetClubSections godoc
// @Summary  List a club's instrument sections (Register)
// @Tags     clubs
// @Produce  json
// @Param    clubId  path  string  true  "Club ID"
// @Success  200     {array}  dto.ClubSectionDto
// @Router   /v1/clubs/{clubId}/sections [get]
func GetClubSections(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	sections, err := clubSectionService(c).List(c.Params("clubId"), userID)
	if err != nil {
		return mapSectionError(err)
	}
	out := make([]dto.ClubSectionDto, 0, len(sections))
	for _, s := range sections {
		out = append(out, sectionToDto(s))
	}
	return c.JSON(out)
}

// PostClubSection godoc
// @Summary  Create a section (managers only)
// @Tags     clubs
// @Accept   json
// @Produce  json
// @Param    clubId  path  string                    true  "Club ID"
// @Param    body    body  dto.ClubSectionUpsertDto  true  "Section payload"
// @Success  200     {object}  dto.ClubSectionDto
// @Router   /v1/clubs/{clubId}/sections [post]
func PostClubSection(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	var body dto.ClubSectionUpsertDto
	if err := c.Bind().Body(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	section, err := clubSectionService(c).Create(c.Params("clubId"), userID, body.Name)
	if err != nil {
		return mapSectionError(err)
	}
	return c.JSON(sectionToDto(section))
}

// PutClubSection godoc
// @Summary  Rename a section (managers only)
// @Tags     clubs
// @Accept   json
// @Param    clubId     path  string                    true  "Club ID"
// @Param    sectionId  path  string                    true  "Section ID"
// @Param    body       body  dto.ClubSectionUpsertDto  true  "Section payload"
// @Success  204
// @Router   /v1/clubs/{clubId}/sections/{sectionId} [put]
func PutClubSection(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	var body dto.ClubSectionUpsertDto
	if err := c.Bind().Body(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	if err := clubSectionService(c).Rename(c.Params("clubId"), userID, c.Params("sectionId"), body.Name); err != nil {
		return mapSectionError(err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// DeleteClubSection godoc
// @Summary  Delete a section (managers only; members/events fall back to whole-club)
// @Tags     clubs
// @Param    clubId     path  string  true  "Club ID"
// @Param    sectionId  path  string  true  "Section ID"
// @Success  204
// @Router   /v1/clubs/{clubId}/sections/{sectionId} [delete]
func DeleteClubSection(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	if err := clubSectionService(c).Delete(c.Params("clubId"), userID, c.Params("sectionId")); err != nil {
		return mapSectionError(err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// PatchClubMemberSection godoc
// @Summary  Assign a member to a section and set the Registerführer flag (managers only)
// @Tags     clubs
// @Accept   json
// @Param    clubId        path  string                         true  "Club ID"
// @Param    memberUserId  path  string                         true  "Member user ID"
// @Param    body          body  dto.ClubMemberSectionPatchDto  true  "Section assignment"
// @Success  204
// @Router   /v1/clubs/{clubId}/members/{memberUserId}/section [patch]
func PatchClubMemberSection(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	var body dto.ClubMemberSectionPatchDto
	if err := c.Bind().Body(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	if err := clubSectionService(c).AssignMember(c.Params("clubId"), userID, c.Params("memberUserId"), body.SectionID, body.SectionLeader); err != nil {
		return mapSectionError(err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}
