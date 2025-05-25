package controllers

import (
	"api_go/auth"
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/mappers"
	"api_go/models"
	"api_go/service"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

func SyncUser(c *fiber.Ctx) error {
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

func GetUser(c *fiber.Ctx) error {
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

func UploadProfile(c *fiber.Ctx) error {
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

func DeleteProfilePic(c *fiber.Ctx) error {
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
func GetUserProfile(c *fiber.Ctx) error {
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

func GetUserImage(c *fiber.Ctx) error {
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

func GetOfflineData(c *fiber.Ctx) error {
	var folderService = GetLocal[service.FolderService](c, "folderService")
	var authorService = GetLocal[service.AuthorService](c, "authorService")
	var noteService = GetLocal[service.NoteService](c, "noteService")

	var userId = GetLocal[string](c, "userId")
	var folders, _ = folderService.LoadAllFolders(userId)
	var authors, _ = authorService.LoadAllAuthors(userId)
	var notes, _, _ = noteService.LoadAllNotes(userId, nil, nil)
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

func UpdateUser(c *fiber.Ctx) error {
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
	if err := c.BodyParser(&userDto); err != nil {
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

func GetKonzertmeisterUrl(c *fiber.Ctx) error {
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

func SetKonzertmeisterUrl(c *fiber.Ctx) error {
	var userId = GetLocal[string](c, "userId")
	var icalSyncService = GetLocal[service.IcalSyncService](c, constants.IcalSyncService)
	var validatorToUse = GetLocal[*validator.Validate](c, constants.Validator)

	var icalSync dto.IcalSyncDto
	if err := c.BodyParser(&icalSync); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	if err := validatorToUse.Struct(icalSync); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid input data",
		})
	}

	var icalSyncModel, err = icalSyncService.SetIcalSync(icalSync, "konzertmeister", userId)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to set Konzertmeister URL",
		})
	}

	return c.JSON(mappers.ConvertIcalSyncFromModelToDto(*icalSyncModel))
}
