package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/service"
	"errors"
	"io"

	"github.com/gofiber/fiber/v3"
)

func clubScoreService(c fiber.Ctx) *service.ClubScoreService {
	svc := GetLocal[service.ClubScoreService](c, constants.ClubScoreService)
	return &svc
}

// mapScoreError maps archive validation errors to 400 and the rest like other club services.
func mapScoreError(err error) error {
	switch {
	case errors.Is(err, service.ErrScorePartNotPDF), errors.Is(err, service.ErrScoreTitleMissing),
		errors.Is(err, service.ErrScorePartName), errors.Is(err, service.ErrScoreSection):
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return mapServiceError(err)
}

// ListClubScores godoc
// @Summary  List the club's sheet music archive
// @Tags     club-scores
// @Produce  json
// @Param    clubId  path  string  true  "Club ID"
// @Success  200     {array}  dto.ClubScoreDto
// @Router   /v1/clubs/{clubId}/scores [get]
func ListClubScores(c fiber.Ctx) error {
	out, err := clubScoreService(c).List(c.Params("clubId"), GetLocal[string](c, "userId"))
	if err != nil {
		return mapScoreError(err)
	}
	return c.JSON(out)
}

// CreateClubScore godoc
// @Summary  Add a piece to the club's sheet music archive
// @Tags     club-scores
// @Accept   json
// @Produce  json
// @Param    clubId  path  string                true  "Club ID"
// @Param    body    body  dto.ClubScorePostDto  true  "Score"
// @Success  200     {object}  dto.ClubScoreDto
// @Router   /v1/clubs/{clubId}/scores [post]
func CreateClubScore(c fiber.Ctx) error {
	var body dto.ClubScorePostDto
	if err := c.Bind().Body(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	out, err := clubScoreService(c).Create(c.Params("clubId"), GetLocal[string](c, "userId"), body)
	if err != nil {
		return mapScoreError(err)
	}
	return c.JSON(out)
}

// GetClubScore godoc
// @Summary  Get a score with its parts
// @Tags     club-scores
// @Produce  json
// @Param    clubId   path  string  true  "Club ID"
// @Param    scoreId  path  string  true  "Score ID"
// @Success  200      {object}  dto.ClubScoreDto
// @Router   /v1/clubs/{clubId}/scores/{scoreId} [get]
func GetClubScore(c fiber.Ctx) error {
	out, err := clubScoreService(c).Get(c.Params("clubId"), GetLocal[string](c, "userId"), c.Params("scoreId"))
	if err != nil {
		return mapScoreError(err)
	}
	return c.JSON(out)
}

// UpdateClubScore godoc
// @Summary  Update title, composer and arranger of a score
// @Tags     club-scores
// @Accept   json
// @Produce  json
// @Param    clubId   path  string                true  "Club ID"
// @Param    scoreId  path  string                true  "Score ID"
// @Param    body     body  dto.ClubScorePostDto  true  "Score"
// @Success  200      {object}  dto.ClubScoreDto
// @Router   /v1/clubs/{clubId}/scores/{scoreId} [put]
func UpdateClubScore(c fiber.Ctx) error {
	var body dto.ClubScorePostDto
	if err := c.Bind().Body(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	out, err := clubScoreService(c).Update(c.Params("clubId"), GetLocal[string](c, "userId"), c.Params("scoreId"), body)
	if err != nil {
		return mapScoreError(err)
	}
	return c.JSON(out)
}

// DeleteClubScore godoc
// @Summary  Delete a score and all its parts
// @Tags     club-scores
// @Param    clubId   path  string  true  "Club ID"
// @Param    scoreId  path  string  true  "Score ID"
// @Success  204
// @Router   /v1/clubs/{clubId}/scores/{scoreId} [delete]
func DeleteClubScore(c fiber.Ctx) error {
	if err := clubScoreService(c).Delete(c.Params("clubId"), GetLocal[string](c, "userId"), c.Params("scoreId")); err != nil {
		return mapScoreError(err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// AddClubScorePart godoc
// @Summary  Upload a part (Stimme) PDF for a score
// @Tags     club-scores
// @Accept   multipart/form-data
// @Produce  json
// @Param    clubId     path      string  true   "Club ID"
// @Param    scoreId    path      string  true   "Score ID"
// @Param    file       formData  file    true   "Part PDF"
// @Param    name       formData  string  true   "Part name, e.g. 2. Klarinette in B"
// @Param    sectionId  formData  string  false  "Section (Register) the part belongs to"
// @Success  200        {object}  dto.ClubScoreDto
// @Router   /v1/clubs/{clubId}/scores/{scoreId}/parts [post]
func AddClubScorePart(c fiber.Ctx) error {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "no file provided")
	}
	if fileHeader.Size > maxClubFileSize {
		return fiber.NewError(fiber.StatusRequestEntityTooLarge, "file exceeds the 25 MB limit")
	}
	opened, err := fileHeader.Open()
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	defer opened.Close()
	content, err := io.ReadAll(opened)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	var sectionID *string
	if v := c.FormValue("sectionId"); v != "" {
		sectionID = &v
	}
	out, err := clubScoreService(c).AddPart(c.Params("clubId"), GetLocal[string](c, "userId"), c.Params("scoreId"), c.FormValue("name"), sectionID, content)
	if err != nil {
		return mapScoreError(err)
	}
	return c.JSON(out)
}

// UpdateClubScorePart godoc
// @Summary  Rename a part or move it to another section
// @Tags     club-scores
// @Accept   json
// @Produce  json
// @Param    clubId   path  string                     true  "Club ID"
// @Param    scoreId  path  string                     true  "Score ID"
// @Param    partId   path  string                     true  "Part ID"
// @Param    body     body  dto.ClubScorePartPatchDto  true  "Part"
// @Success  200      {object}  dto.ClubScoreDto
// @Router   /v1/clubs/{clubId}/scores/{scoreId}/parts/{partId} [patch]
func UpdateClubScorePart(c fiber.Ctx) error {
	var body dto.ClubScorePartPatchDto
	if err := c.Bind().Body(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	out, err := clubScoreService(c).UpdatePart(c.Params("clubId"), GetLocal[string](c, "userId"), c.Params("scoreId"), c.Params("partId"), body)
	if err != nil {
		return mapScoreError(err)
	}
	return c.JSON(out)
}

// DeleteClubScorePart godoc
// @Summary  Delete a part
// @Tags     club-scores
// @Param    clubId   path  string  true  "Club ID"
// @Param    scoreId  path  string  true  "Score ID"
// @Param    partId   path  string  true  "Part ID"
// @Success  204
// @Router   /v1/clubs/{clubId}/scores/{scoreId}/parts/{partId} [delete]
func DeleteClubScorePart(c fiber.Ctx) error {
	if err := clubScoreService(c).DeletePart(c.Params("clubId"), GetLocal[string](c, "userId"), c.Params("scoreId"), c.Params("partId")); err != nil {
		return mapScoreError(err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// GetClubScorePartPDF godoc
// @Summary  Download a part's PDF (any club member)
// @Tags     club-scores
// @Produce  application/pdf
// @Param    clubId   path  string  true  "Club ID"
// @Param    scoreId  path  string  true  "Score ID"
// @Param    partId   path  string  true  "Part ID"
// @Success  200
// @Router   /v1/clubs/{clubId}/scores/{scoreId}/parts/{partId}/pdf [get]
func GetClubScorePartPDF(c fiber.Ctx) error {
	content, err := clubScoreService(c).PartPDF(c.Params("clubId"), GetLocal[string](c, "userId"), c.Params("scoreId"), c.Params("partId"))
	if err != nil {
		return mapScoreError(err)
	}
	c.Set(fiber.HeaderContentType, "application/pdf")
	return c.Send(content)
}

// ChooseClubScorePart godoc
// @Summary  Remember which part the caller plays for a score
// @Tags     club-scores
// @Accept   json
// @Param    clubId   path  string                      true  "Club ID"
// @Param    scoreId  path  string                      true  "Score ID"
// @Param    body     body  dto.ClubScorePartChoiceDto  true  "Chosen part"
// @Success  204
// @Router   /v1/clubs/{clubId}/scores/{scoreId}/choice [put]
func ChooseClubScorePart(c fiber.Ctx) error {
	var body dto.ClubScorePartChoiceDto
	if err := c.Bind().Body(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	if err := clubScoreService(c).ChoosePart(c.Params("clubId"), GetLocal[string](c, "userId"), c.Params("scoreId"), body.PartID); err != nil {
		return mapScoreError(err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}
