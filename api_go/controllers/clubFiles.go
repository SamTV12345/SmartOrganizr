package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/models"
	"api_go/service"
	"io"
	"time"

	"github.com/gofiber/fiber/v3"
)

const maxClubFileSize = 25 * 1024 * 1024 // 25 MB

// GetClubFiles godoc
// @Summary  List files of a club
// @Tags     clubFiles
// @Produce  json
// @Param    clubId  path  string  true  "Club ID"
// @Success  200     {array}  dto.ClubFileDto
// @Router   /v1/clubs/{clubId}/files [get]
func GetClubFiles(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	clubID := c.Params("clubId")
	if _, err := requireClubMember(c, clubID, userID); err != nil {
		return err
	}
	fileService := GetLocal[service.ClubFileService](c, constants.ClubFileService)
	files, err := fileService.ListForClub(clubID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(mapClubFiles(files))
}

// UploadClubFile godoc
// @Summary  Upload a file to a club (multipart "file")
// @Tags     clubFiles
// @Accept   multipart/form-data
// @Produce  json
// @Param    clubId  path  string  true  "Club ID"
// @Success  200     {object} dto.ClubFileDto
// @Router   /v1/clubs/{clubId}/files [post]
func UploadClubFile(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	clubID := c.Params("clubId")
	if err := requireClubFileWrite(c, clubID, userID); err != nil {
		return err
	}

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

	mimeType := fileHeader.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	fileService := GetLocal[service.ClubFileService](c, constants.ClubFileService)
	created, err := fileService.Create(clubID, fileHeader.Filename, mimeType, content, userID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(mapClubFile(created))
}

// DownloadClubFile godoc
// @Summary  Download a club file
// @Tags     clubFiles
// @Param    clubId  path  string  true  "Club ID"
// @Param    fileId  path  string  true  "File ID"
// @Success  200     {file} file
// @Router   /v1/clubs/{clubId}/files/{fileId} [get]
func DownloadClubFile(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	clubID := c.Params("clubId")
	fileID := c.Params("fileId")
	if _, err := requireClubMember(c, clubID, userID); err != nil {
		return err
	}
	fileService := GetLocal[service.ClubFileService](c, constants.ClubFileService)
	file, err := fileService.GetContent(clubID, fileID)
	if err != nil {
		return fiber.NewError(fiber.StatusNotFound, "file not found")
	}
	c.Set("Content-Type", file.MimeType)
	c.Set("Content-Disposition", `attachment; filename="`+file.Name+`"`)
	return c.Send(file.Content)
}

// DeleteClubFile godoc
// @Summary  Delete a club file
// @Tags     clubFiles
// @Param    clubId  path  string  true  "Club ID"
// @Param    fileId  path  string  true  "File ID"
// @Success  204
// @Router   /v1/clubs/{clubId}/files/{fileId} [delete]
func DeleteClubFile(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	clubID := c.Params("clubId")
	fileID := c.Params("fileId")
	if err := requireClubFileWrite(c, clubID, userID); err != nil {
		return err
	}
	fileService := GetLocal[service.ClubFileService](c, constants.ClubFileService)
	if err := fileService.Delete(clubID, fileID); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func requireClubFileWrite(c fiber.Ctx, clubID string, userID string) error {
	role, err := requireClubMember(c, clubID, userID)
	if err != nil {
		return err
	}
	if !canWriteSection(role, "dateien") {
		return fiber.NewError(fiber.StatusForbidden, "no write access to files")
	}
	return nil
}

func mapClubFile(f models.ClubFile) dto.ClubFileDto {
	return dto.ClubFileDto{
		ID:           f.ID,
		ClubID:       f.ClubID,
		Name:         f.Name,
		MimeType:     f.MimeType,
		SizeBytes:    f.SizeBytes,
		UploadedById: f.UploaderID,
		UploadedBy:   f.UploadedBy,
		CreatedAt:    f.CreatedAt.Format(time.RFC3339),
	}
}

func mapClubFiles(files []models.ClubFile) []dto.ClubFileDto {
	items := make([]dto.ClubFileDto, 0, len(files))
	for _, f := range files {
		items = append(items, mapClubFile(f))
	}
	return items
}
