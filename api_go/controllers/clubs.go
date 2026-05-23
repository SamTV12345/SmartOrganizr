package controllers

import (
	"api_go/auth"
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/mappers"
	"api_go/models"
	"api_go/service"
	"bytes"
	"encoding/csv"
	"errors"
	"fmt"
	"github.com/gofiber/fiber/v3"
	"io"
	"strings"
	"time"
)

// GetAllClubsForMe godoc
// @Summary  List clubs the current user belongs to
// @Tags     clubs
// @Produce  json
// @Param    userId  path  string  true  "User ID"
// @Success  200  {array}  dto.ClubDto
// @Router   /v1/clubs/{userId} [get]
func GetAllClubsForMe(c fiber.Ctx) error {
	userId := GetLocal[string](c, "userId")
	clubService := GetLocal[service.ClubService](c, constants.ClubService)
	result, err := clubService.GetAllClubsForMyId(&userId)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}

	clubDtos := make([]dto.ClubDto, 0)
	for _, clubModel := range *result {
		clubDtos = append(clubDtos, mappers.ConvertClubFromModelToDto(clubModel))
	}
	return c.JSON(clubDtos)
}

// PostClub godoc
// @Summary  Create a new club (with the current user as admin)
// @Tags     clubs
// @Accept   json
// @Produce  json
// @Param    body  body  dto.ClubPostDto  true  "Club payload"
// @Success  200   {object} dto.ClubDto
// @Router   /v1/clubs [post]
func PostClub(c fiber.Ctx) error {
	userId := GetLocal[string](c, "userId")
	clubService := GetLocal[service.ClubService](c, constants.ClubService)
	var club dto.ClubPostDto
	if err := c.Bind().Body(&club); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	savedClub, err := clubService.CreateClub(club)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	if err := clubService.AddUserToClub(savedClub.ID, userId, models.Admin); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(mappers.ConvertClubFromModelToDto(*savedClub))
}

// InviteClubMembers godoc
// @Summary  Invite users by email to a club
// @Tags     clubs
// @Accept   json
// @Produce  json
// @Param    clubId  path  string                true  "Club ID"
// @Param    body    body  dto.ClubInvitePostDto true  "Email payload"
// @Success  200     {object} dto.ClubInviteResultDto
// @Router   /v1/clubs/{clubId}/members/invite [post]
func InviteClubMembers(c fiber.Ctx) error {
	emails, parseErr := parseInviteEmailsFromRequest(c)
	if parseErr != nil {
		return fiber.NewError(fiber.StatusBadRequest, parseErr.Error())
	}
	result, err := handleInviteForEmails(c, emails)
	if err != nil {
		return err
	}
	return c.JSON(result)
}

// ImportClubMembersCSV godoc
// @Summary  Invite club members from a CSV upload (multipart "file")
// @Tags     clubs
// @Accept   multipart/form-data
// @Produce  json
// @Param    clubId  path  string  true  "Club ID"
// @Success  200     {object} dto.ClubInviteResultDto
// @Router   /v1/clubs/{clubId}/members/import [post]
func ImportClubMembersCSV(c fiber.Ctx) error {
	emails, parseErr := parseInviteEmailsFromRequest(c)
	if parseErr != nil {
		return fiber.NewError(fiber.StatusBadRequest, parseErr.Error())
	}
	result, err := handleInviteForEmails(c, emails)
	if err != nil {
		return err
	}
	return c.JSON(result)
}

// ExportClubMembersCSV godoc
// @Summary  Download club members as CSV
// @Tags     clubs
// @Produce  text/csv
// @Param    clubId  path  string  true  "Club ID"
// @Success  200     {file} file
// @Router   /v1/clubs/{clubId}/members/export [get]
func ExportClubMembersCSV(c fiber.Ctx) error {
	clubMemberService := GetLocal[service.ClubMemberService](c, constants.ClubMemberService)
	requesterId := GetLocal[string](c, "userId")
	clubId := c.Params("clubId")

	if _, err := clubMemberService.GetRoleInClub(clubId, requesterId); err != nil {
		return fiber.NewError(fiber.StatusForbidden, "no club access")
	}

	members, err := clubMemberService.GetAllMembersForClub(clubId)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}

	var buffer bytes.Buffer
	writer := csv.NewWriter(&buffer)
	writer.Comma = ';'

	header := []string{"Vorname", "Nachname", "E-Mail", "Mobiltelefon", "Geburtstag", "Land", "Postleitzahl", "Ort", "Straße", "Leiter", "Aktiv", "Registriert", "Id"}
	if err := writer.Write(header); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}

	for _, member := range *members {
		isLeader := "Nein"
		if member.Role == models.Admin {
			isLeader = "Ja"
		}
		record := []string{
			member.Firstname,
			member.Lastname,
			member.Email,
			member.TelephoneNumber,
			"",
			"",
			"",
			"",
			"",
			isLeader,
			"Ja",
			boolToGermanYesNo(member.Email != ""),
			member.UserId,
		}
		if err := writer.Write(record); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, err.Error())
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}

	c.Set("Content-Type", "text/csv; charset=utf-8")
	c.Set("Content-Disposition", "attachment; filename=Mitglieder.csv")
	return c.Send(buffer.Bytes())
}

// GetClubMembers godoc
// @Summary  List members of a club
// @Tags     clubs
// @Produce  json
// @Param    clubId  path  string  true  "Club ID"
// @Success  200     {array}  dto.ClubMemberDto
// @Router   /v1/clubs/{clubId}/members [get]
func GetClubMembers(c fiber.Ctx) error {
	clubMemberService := GetLocal[service.ClubMemberService](c, constants.ClubMemberService)
	requesterId := GetLocal[string](c, "userId")
	clubId := c.Params("clubId")

	if _, err := clubMemberService.GetRoleInClub(clubId, requesterId); err != nil {
		return fiber.NewError(fiber.StatusForbidden, "no club access")
	}

	members, err := clubMemberService.GetAllMembersForClub(clubId)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}

	memberDtos := make([]dto.ClubMemberDto, 0, len(*members))
	for _, member := range *members {
		memberDtos = append(memberDtos, dto.ClubMemberDto{
			UserID:    member.UserId,
			Username:  member.Username,
			Email:     member.Email,
			Firstname: member.Firstname,
			Lastname:  member.Lastname,
			Role:      member.Role.String(),
		})
	}

	return c.JSON(memberDtos)
}

// PatchClubMemberRole godoc
// @Summary  Change a club member's role
// @Tags     clubs
// @Accept   json
// @Param    clubId        path  string                      true  "Club ID"
// @Param    memberUserId  path  string                      true  "Member user ID"
// @Param    body          body  dto.ClubMemberRolePatchDto  true  "Role payload"
// @Success  204
// @Router   /v1/clubs/{clubId}/members/{memberUserId}/role [patch]
func PatchClubMemberRole(c fiber.Ctx) error {
	clubMemberService := GetLocal[service.ClubMemberService](c, constants.ClubMemberService)
	requesterId := GetLocal[string](c, "userId")
	clubId := c.Params("clubId")
	memberUserID := c.Params("memberUserId")

	var rolePatch dto.ClubMemberRolePatchDto
	if err := c.Bind().Body(&rolePatch); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	if err := clubMemberService.UpdateMemberRole(requesterId, clubId, memberUserID, rolePatch.Role); err != nil {
		return fiber.NewError(fiber.StatusForbidden, err.Error())
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// GetMyClubPermissions godoc
// @Summary  Get the current user's permissions inside a club
// @Tags     clubs
// @Produce  json
// @Param    clubId  path  string  true  "Club ID"
// @Success  200     {object} dto.ClubPermissionsDto
// @Router   /v1/clubs/{clubId}/me/permissions [get]
func GetMyClubPermissions(c fiber.Ctx) error {
	clubMemberService := GetLocal[service.ClubMemberService](c, constants.ClubMemberService)
	requesterId := GetLocal[string](c, "userId")
	clubId := c.Params("clubId")

	role, err := clubMemberService.GetRoleInClub(clubId, requesterId)
	if err != nil {
		return fiber.NewError(fiber.StatusForbidden, "no club access")
	}

	return c.JSON(buildPermissionsDto(role))
}

// GetPublicClubInvitation godoc
// @Summary  Get a public club invitation by token
// @Tags     public
// @Produce  json
// @Param    token  path  string  true  "Invitation token"
// @Success  200    {object} dto.ClubInvitationPublicDto
// @Router   /public/invitations/{token} [get]
func GetPublicClubInvitation(c fiber.Ctx) error {
	clubInvitationService := GetLocal[service.ClubInvitationService](c, constants.ClubInvitationService)
	token := c.Params("token")

	invitation, err := clubInvitationService.GetInvitationByToken(token)
	if err != nil {
		return fiber.NewError(fiber.StatusNotFound, "invitation not found")
	}

	now := time.Now()
	return c.JSON(dto.ClubInvitationPublicDto{
		Token:        invitation.Token,
		ClubID:       invitation.ClubID,
		ClubName:     invitation.ClubName,
		InvitedEmail: invitation.InvitedEmail,
		ExpiresAt:    invitation.ExpiresAt.Format(time.RFC3339),
		IsAccepted:   invitation.AcceptedAt != nil,
		IsExpired:    invitation.ExpiresAt.Before(now),
	})
}

// AcceptClubInvitation godoc
// @Summary  Authenticated accept of a club invitation
// @Tags     invitations
// @Param    token  path  string  true  "Invitation token"
// @Success  204
// @Router   /v1/invitations/{token}/accept [post]
func AcceptClubInvitation(c fiber.Ctx) error {
	clubInvitationService := GetLocal[service.ClubInvitationService](c, constants.ClubInvitationService)
	clubService := GetLocal[service.ClubService](c, constants.ClubService)
	userService := GetLocal[service.UserService](c, constants.UserService)
	requesterId := GetLocal[string](c, "userId")
	token := c.Params("token")

	user, userErr := userService.LoadUser(requesterId)
	email := ""
	if userErr == nil {
		email = user.Email
	}
	if email == "" {
		claims := GetLocal[*auth.Claims](c, "claims")
		if claims != nil {
			email = claims.Email
		}
	}
	if email == "" {
		return fiber.NewError(fiber.StatusBadRequest, "authenticated user has no email")
	}

	if err := clubInvitationService.AcceptInvitation(token, requesterId, email, clubService); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// CompletePublicClubInvitation godoc
// @Summary  Set password and complete a public invitation
// @Tags     public
// @Accept   json
// @Param    token  path  string                          true  "Invitation token"
// @Param    body   body  dto.ClubInvitationCompleteDto   true  "Completion payload"
// @Success  204
// @Router   /public/invitations/{token}/complete [post]
func CompletePublicClubInvitation(c fiber.Ctx) error {
	clubInvitationService := GetLocal[service.ClubInvitationService](c, constants.ClubInvitationService)
	clubService := GetLocal[service.ClubService](c, constants.ClubService)
	userService := GetLocal[service.UserService](c, constants.UserService)
	keycloakService := GetLocal[service.KeycloakService](c, constants.KeycloakService)
	token := c.Params("token")

	var completeDto dto.ClubInvitationCompleteDto
	if err := c.Bind().Body(&completeDto); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	password := strings.TrimSpace(completeDto.Password)
	confirmPassword := strings.TrimSpace(completeDto.ConfirmPassword)
	if password == "" {
		return fiber.NewError(fiber.StatusBadRequest, "password is required")
	}
	if len(password) < 8 {
		return fiber.NewError(fiber.StatusBadRequest, "password must be at least 8 characters")
	}
	if password != confirmPassword {
		return fiber.NewError(fiber.StatusBadRequest, "password confirmation does not match")
	}

	if err := clubInvitationService.CompleteInvitationWithPassword(
		token,
		password,
		completeDto.Firstname,
		completeDto.Lastname,
		clubService,
		userService,
		keycloakService,
	); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func handleInviteForEmails(c fiber.Ctx, emails []string) (dto.ClubInviteResultDto, error) {
	clubService := GetLocal[service.ClubService](c, constants.ClubService)
	clubMemberService := GetLocal[service.ClubMemberService](c, constants.ClubMemberService)
	clubInvitationService := GetLocal[service.ClubInvitationService](c, constants.ClubInvitationService)
	userService := GetLocal[service.UserService](c, constants.UserService)
	requesterId := GetLocal[string](c, "userId")
	clubId := c.Params("clubId")

	requesterRole, err := clubMemberService.GetRoleInClub(clubId, requesterId)
	if err != nil {
		return dto.ClubInviteResultDto{}, fiber.NewError(fiber.StatusForbidden, "no club access")
	}
	if !canInviteMembers(requesterRole) {
		return dto.ClubInviteResultDto{}, fiber.NewError(fiber.StatusForbidden, "insufficient role permissions")
	}

	addedEmails, invitedEmails, err := clubService.InviteUsersByEmail(clubId, emails)
	if err != nil {
		return dto.ClubInviteResultDto{}, fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}

	requesterUser, _ := userService.LoadUser(requesterId)
	requesterName := ""
	if requesterUser != nil {
		requesterName = strings.TrimSpace(requesterUser.Firstname + " " + requesterUser.Lastname)
	}

	finalInvited := make([]string, 0, len(invitedEmails))
	failedEmails := make([]string, 0)
	for _, email := range invitedEmails {
		if _, sendErr := clubInvitationService.CreateAndSendInvitation(clubId, requesterId, requesterName, email); sendErr != nil {
			failedEmails = append(failedEmails, email)
			continue
		}
		finalInvited = append(finalInvited, email)
	}

	return dto.ClubInviteResultDto{
		AddedEmails:   addedEmails,
		InvitedEmails: finalInvited,
		FailedEmails:  failedEmails,
	}, nil
}

func parseInviteEmailsFromRequest(c fiber.Ctx) ([]string, error) {
	var inviteDto dto.ClubInvitePostDto
	if err := c.Bind().Body(&inviteDto); err == nil && len(inviteDto.Emails) > 0 {
		return normalizeEmailList(inviteDto.Emails), nil
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return nil, errors.New("no emails or csv file provided")
	}
	file, err := fileHeader.Open()
	if err != nil {
		return nil, err
	}
	defer file.Close()

	content, err := io.ReadAll(file)
	if err != nil {
		return nil, err
	}

	reader := csv.NewReader(bytes.NewReader(content))
	reader.Comma = ';'
	rows, err := reader.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("csv parse failed: %w", err)
	}
	if len(rows) == 0 {
		return nil, errors.New("csv is empty")
	}

	emailIndex := findEmailColumnIndex(rows[0])
	if emailIndex < 0 {
		return nil, errors.New("csv requires an E-Mail column")
	}

	emails := make([]string, 0)
	for _, row := range rows[1:] {
		if emailIndex >= len(row) {
			continue
		}
		emails = append(emails, row[emailIndex])
	}
	return normalizeEmailList(emails), nil
}

func findEmailColumnIndex(header []string) int {
	for idx, col := range header {
		normalized := strings.ToLower(strings.TrimSpace(col))
		if normalized == "e-mail" || normalized == "email" || normalized == "e_mail" {
			return idx
		}
	}
	return -1
}

func normalizeEmailList(input []string) []string {
	unique := make(map[string]bool)
	result := make([]string, 0)
	for _, email := range input {
		normalized := strings.ToLower(strings.TrimSpace(email))
		if normalized == "" {
			continue
		}
		if unique[normalized] {
			continue
		}
		unique[normalized] = true
		result = append(result, normalized)
	}
	return result
}

func canInviteMembers(role models.ClubRole) bool {
	return role == models.Admin || role == models.CoAdmin || role == models.Secretary || role == models.Treasurer
}

func buildPermissionsDto(role models.ClubRole) dto.ClubPermissionsDto {
	sectionWrite := map[string]bool{
		"pinnwand":       canWriteSection(role, "pinnwand"),
		"nachrichten":    canWriteSection(role, "nachrichten"),
		"aufgaben":       canWriteSection(role, "aufgaben"),
		"dateien":        canWriteSection(role, "dateien"),
		"register":       canWriteSection(role, "register"),
		"gruppen":        canWriteSection(role, "gruppen"),
		"mitglieder":     canWriteSection(role, "mitglieder"),
		"rollen":         canWriteSection(role, "rollen"),
		"raeume":         canWriteSection(role, "raeume"),
		"musikstuecke":   canWriteSection(role, "musikstuecke"),
		"setlists":       canWriteSection(role, "setlists"),
		"terminvorlagen": canWriteSection(role, "terminvorlagen"),
		"bearbeiten":     canWriteSection(role, "bearbeiten"),
	}

	return dto.ClubPermissionsDto{
		Role:            role.String(),
		CanManageRoles:  role == models.Admin || role == models.CoAdmin,
		CanInviteMember: canInviteMembers(role),
		SectionWrite:    sectionWrite,
	}
}

func canWriteSection(role models.ClubRole, section string) bool {
	if role == models.Admin || role == models.CoAdmin {
		return true
	}

	normalized := strings.TrimSpace(strings.ToLower(section))
	if role == models.Secretary || role == models.Treasurer {
		return normalized == "pinnwand" || normalized == "nachrichten" || normalized == "mitglieder"
	}
	return false
}

func boolToGermanYesNo(value bool) string {
	if value {
		return "Ja"
	}
	return "Nein"
}
