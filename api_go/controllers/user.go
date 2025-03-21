package controllers

import (
	"api_go/auth"
	"api_go/db"
	"api_go/models"
	"api_go/service"
	"database/sql"
	"github.com/gofiber/fiber/v2"
)

func SyncUser(c *fiber.Ctx) error {
	var queries = GetLocal[*db.Queries](c, "db")
	var userId = GetLocal[string](c, "userId")
	var claims = GetLocal[*auth.Claims](c, "claims")
	var _, err = queries.FindUserById(c.Context(), userId)
	if err != nil {
		_, err := queries.CreateUser(c.Context(), db.CreateUserParams{
			UserID: userId,
			Username: sql.NullString{
				String: claims.Username,
			},
			SelectedTheme: sql.NullString{
				String: "saga",
			},
			SideBarCollapsed: false,
		})
		if err != nil {
			return err
		}
	} else {
		err := queries.UpdateUser(c.Context(), db.UpdateUserParams{
			UserID: userId,
			Username: sql.NullString{
				String: claims.Username,
			},
		})
		if err != nil {
			return err
		}
	}
	return c.SendStatus(200)
}

func GetOfflineData(c *fiber.Ctx) error {
	var folderService = GetLocal[service.FolderService](c, "folderService")
	var authorService = GetLocal[service.AuthorService](c, "authorService")
	var noteService = GetLocal[service.NoteService](c, "noteService")

	var userId = GetLocal[string](c, "userId")
	var folders, _ = folderService.LoadAllFolders(userId)
	var authors, _ = authorService.LoadAllAuthors(userId)
	var notes, _ = noteService.LoadAllNotes(userId)
	type DataExporter struct {
		Authors []models.Author `json:"authors"`
		Folders []models.Folder `json:"folders"`
		Notes   []models.Note   `json:"notes"`
	}
	var dataExporter = DataExporter{
		Authors: authors,
		Folders: folders,
		Notes:   notes,
	}

	return c.JSON(dataExporter)
}
