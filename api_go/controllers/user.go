package controllers

import (
	"api_go/auth"
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/mappers"
	"api_go/models"
	"api_go/service"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v3"
)

// SyncUser godoc
// @Summary  Sync the authenticated user from Keycloak claims (creates if missing)
// @Tags     users
// @Success  200
// @Router   /v1/users [put]
func SyncUser(c fiber.Ctx) error {
	var userService = GetLocal[service.UserService](c, "userService")
	var userId = GetLocal[string](c, "userId")
	var claims = GetLocal[*auth.Claims](c, "claims")
	var _, err = userService.LoadUser(userId)
	if err != nil {
		err = userService.SaveUser(&models.User{
			UserId:           userId,
			Username:         claims.Username,
			SideBarCollapsed: false,
			Email:            claims.Email,
			Lastname:         claims.FamilyName,
			Firstname:        claims.GivenName,
		})
		if err != nil {
			return err
		}
	} else {
		err := userService.UpdateSyncFromKeycloakUser(&models.User{
			UserId:           userId,
			Username:         claims.Username,
			SideBarCollapsed: false,
			Email:            claims.Email,
			Lastname:         claims.FamilyName,
			Firstname:        claims.GivenName,
		})
		if err != nil {
			return err
		}
	}
	return c.SendStatus(200)
}

// GetUser godoc
// @Summary  Get the currently authenticated user (by token)
// @Tags     users
// @Produce  json
// @Success  200  {object} dto.User
// @Failure  404  {object} map[string]string
// @Router   /v1/users/token [get]
func GetUser(c fiber.Ctx) error {
	var userId = GetLocal[string](c, "userId")
	var userService = GetLocal[service.UserService](c, "userService")
	var user, err = userService.LoadUser(userId)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "User not found",
		})
	}
	return c.JSON(mappers.ConvertUserDtoFromModel(*user, c))
}

// UploadProfile godoc
// @Summary  Upload a profile picture (raw image body)
// @Tags     users
// @Accept   octet-stream
// @Produce  json
// @Param    userId  path  string  true  "User ID"
// @Success  200  {object} dto.User
// @Failure  404  {object} map[string]string
// @Router   /v1/users/{userId}/profile [post]
func UploadProfile(c fiber.Ctx) error {
	var userService = GetLocal[service.UserService](c, "userService")
	var userId = GetLocal[string](c, "userId")
	var profileData = c.BodyRaw()
	var loadedUser, err = userService.LoadUser(userId)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "User not found",
		})
	}
	loadedUser.ProfilePic = profileData
	err = userService.UpdateProfilePicture(loadedUser.UserId, profileData)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to update user",
		})
	}
	return c.JSON(mappers.ConvertUserDtoFromModel(*loadedUser, c))
}

// DeleteProfilePic godoc
// @Summary  Delete the profile picture of a user
// @Tags     users
// @Param    userId  path  string  true  "User ID"
// @Produce  json
// @Success  200  {object} dto.User
// @Router   /v1/users/{userId}/profile [delete]
func DeleteProfilePic(c fiber.Ctx) error {
	var userService = GetLocal[service.UserService](c, "userService")
	var userId = GetLocal[string](c, "userId")
	var loadedUser, err = userService.LoadUser(userId)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "User not found",
		})
	}
	loadedUser.ProfilePic = nil
	err = userService.DeleteProfilePicture(loadedUser.UserId)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to update user",
		})
	}
	return c.JSON(mappers.ConvertUserDtoFromModel(*loadedUser, c))
}
// GetUserProfile godoc
// @Summary  Get current user's profile
// @Tags     users
// @Produce  json
// @Success  200  {object} dto.User
// @Router   /v1/users/me [get]
func GetUserProfile(c fiber.Ctx) error {
	var userId = GetLocal[string](c, "userId")
	var userService = GetLocal[service.UserService](c, "userService")
	var loadedUser, err = userService.LoadUser(userId)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "User not found",
		})
	}
	convertedDto := mappers.ConvertUserDtoFromModel(*loadedUser, c)
	return c.JSON(convertedDto)
}

// GetUserImage godoc
// @Summary  Public access to a user's profile image
// @Tags     public
// @Produce  png
// @Param    userId  path  string  true  "User ID"
// @Param    image   path  string  true  "Image identifier"
// @Success  200  {file} file
// @Router   /public/users/{userId}/{image}.png [get]
func GetUserImage(c fiber.Ctx) error {
	var userId = c.Params("userId")
	var userService = GetLocal[service.UserService](c, "userService")
	var loadedUser, err = userService.LoadUser(userId)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "User not found",
		})
	}
	if loadedUser.ProfilePic == nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "User profile image not found",
		})
	}
	var image = loadedUser.ProfilePic
	return c.Send(image)
}

// GetOfflineData godoc
// @Summary  Bulk download of all folders, authors and notes for offline use (metadata only)
// @Tags     users
// @Produce  json
// @Success  200  {object} dto.OfflineDataResponse
// @Router   /v1/users/offline [get]
func GetOfflineData(c fiber.Ctx) error {
	var folderService = GetLocal[service.FolderService](c, "folderService")
	var authorService = GetLocal[service.AuthorService](c, "authorService")
	var noteService = GetLocal[service.NoteService](c, "noteService")

	var userId = GetLocal[string](c, "userId")
	var folders, _ = folderService.LoadAllFolders(userId)
	var authors, _ = authorService.LoadAllAuthors(userId)
	var notes, _, _ = noteService.LoadAllNotes(userId, nil, nil)

	authorDtos := make([]dto.Author, 0, len(authors))
	for _, a := range authors {
		authorDtos = append(authorDtos, mappers.ConvertAuthorDtoFromModel(a))
	}
	folderDtos := make([]dto.Folder, 0, len(folders))
	for _, f := range folders {
		folderDtos = append(folderDtos, mappers.ConvertFolderDtoFromModel(f, c))
	}
	noteDtos := make([]dto.Note, 0, len(notes))
	for i := range notes {
		noteDtos = append(noteDtos, *mappers.ConvertNoteDtoFromModel(&notes[i], c))
	}

	return c.JSON(dto.OfflineDataResponse{
		Authors: authorDtos,
		Folders: folderDtos,
		Notes:   noteDtos,
	})
}

// UpdateUser godoc
// @Summary  Update the current user's profile fields
// @Tags     users
// @Accept   json
// @Produce  json
// @Param    userId  path  string                true  "User ID"
// @Param    body    body  dto.UserPatchDto      true  "User patch payload"
// @Success  200     {object} dto.User
// @Failure  400     {object} map[string]string
// @Failure  404     {object} map[string]string
// @Failure  500     {object} map[string]string
// @Router   /v1/users/{userId} [patch]
func UpdateUser(c fiber.Ctx) error {
	var userId = GetLocal[string](c, "userId")
	var userService = GetLocal[service.UserService](c, constants.UserService)
	var keycloakService = GetLocal[service.KeycloakService](c, constants.KeycloakService)
	var loadedUser, err = userService.LoadUser(userId)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "User not found",
		})
	}
	var userDto dto.UserPatchDto
	if err := c.Bind().Body(&userDto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	loadedUser.Username = userDto.Username
	loadedUser.Firstname = userDto.Firstname
	loadedUser.Lastname = userDto.Lastname
	loadedUser.Email = userDto.Email
	loadedUser.TelephoneNumber = userDto.TelephoneNumber
	loadedUser.SideBarCollapsed = userDto.SideBarCollapsed
	err = keycloakService.UpdateUser(*loadedUser)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to update user in Keycloak",
		})
	}
	err = userService.UpdateFromEndpoint(loadedUser)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to update user in smartOrganizr",
		})
	}
	return c.JSON(mappers.ConvertUserDtoFromModel(*loadedUser, c))
}

// GetKonzertmeisterUrl godoc
// @Summary  Get the configured Konzertmeister iCal URL
// @Tags     users
// @Produce  json
// @Param    userId  path  string  true  "User ID"
// @Success  200     {object} dto.IcalSyncDto
// @Failure  404     {object} map[string]string
// @Failure  500     {object} map[string]string
// @Router   /v1/users/{userId}/konzertmeister-url [get]
func GetKonzertmeisterUrl(c fiber.Ctx) error {
	var userId = GetLocal[string](c, "userId")
	var icalSyncService = GetLocal[service.IcalSyncService](c, constants.IcalSyncService)

	var icalSyncModel, err = icalSyncService.GetIcalSync("konzertmeister", userId)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to get Konzertmeister URL",
		})
	}

	if icalSyncModel == nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Konzertmeister URL not found",
		})
	}

	return c.JSON(mappers.ConvertIcalSyncFromModelToDto(*icalSyncModel))
}

// SetKonzertmeisterUrl godoc
// @Summary  Save the Konzertmeister iCal URL
// @Tags     users
// @Accept   json
// @Produce  json
// @Param    userId  path  string             true  "User ID"
// @Param    body    body  dto.IcalSyncDto    true  "iCal URL payload"
// @Success  200     {object} dto.IcalSyncDto
// @Failure  400     {object} map[string]string
// @Failure  500     {object} map[string]string
// @Router   /v1/users/{userId}/konzertmeister-url [post]
func SetKonzertmeisterUrl(c fiber.Ctx) error {
	var userId = GetLocal[string](c, "userId")
	var icalSyncService = GetLocal[service.IcalSyncService](c, constants.IcalSyncService)
	var validatorToUse = GetLocal[*validator.Validate](c, constants.Validator)

	var icalSync dto.IcalSyncDto
	if err := c.Bind().Body(&icalSync); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	if err := validatorToUse.Struct(icalSync); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid input data",
		})
	}

	validatedIcal, err := icalSyncService.ValidateIcalOnline(icalSync.Url)

	if err != nil || !validatedIcal {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to validate Konzertmeister URL",
		})
	}

	icalSyncModel, err := icalSyncService.SetIcalSync(icalSync, "konzertmeister", userId)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to set Konzertmeister URL",
		})
	}

	return c.JSON(mappers.ConvertIcalSyncFromModelToDto(*icalSyncModel))
}

// SyncKonzertmeisterUrl godoc
// @Summary  Trigger iCal sync for the configured Konzertmeister URL
// @Tags     users
// @Produce  json
// @Param    userId  path  string  true  "User ID"
// @Success  200     {object} map[string]int
// @Failure  500     {object} map[string]string
// @Router   /v1/users/{userId}/konzertmeister-url/sync [post]
func SyncKonzertmeisterUrl(c fiber.Ctx) error {
	var userId = GetLocal[string](c, "userId")
	var icalSyncService = GetLocal[service.IcalSyncService](c, constants.IcalSyncService)

	syncedCount, err := icalSyncService.SyncIcalByType("konzertmeister", userId)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to sync Konzertmeister URL",
		})
	}

	return c.JSON(fiber.Map{
		"syncedEvents": syncedCount,
	})
}
