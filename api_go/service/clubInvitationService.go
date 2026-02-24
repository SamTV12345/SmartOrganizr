package service

import (
	"api_go/db"
	"api_go/models"
	"context"
	"database/sql"
	"errors"
	"github.com/google/uuid"
	"strings"
	"time"
)

type ClubInvitationService struct {
	queries     *db.Queries
	ctx         context.Context
	mailService MailService
	baseURL     string
}

type ClubInvitationDetails struct {
	Token        string
	ClubID       string
	ClubName     string
	InvitedEmail string
	ExpiresAt    time.Time
	AcceptedAt   *time.Time
}

func NewClubInvitationService(queries *db.Queries, mailService MailService, baseURL string) ClubInvitationService {
	return ClubInvitationService{
		queries:     queries,
		ctx:         context.Background(),
		mailService: mailService,
		baseURL:     baseURL,
	}
}

func (s *ClubInvitationService) CreateAndSendInvitation(clubID string, invitedByUserID string, invitedByName string, email string) (string, error) {
	token := uuid.NewString()
	expiresAt := time.Now().Add(14 * 24 * time.Hour)
	err := s.queries.CreateClubInvitation(s.ctx, db.CreateClubInvitationParams{
		Token:           token,
		ClubID:          clubID,
		InvitedEmail:    email,
		InvitedByUserID: invitedByUserID,
		ExpiresAt:       db.NewSQLNullTime(expiresAt),
	})
	if err != nil {
		return "", err
	}

	club, err := s.queries.FindClubByID(s.ctx, clubID)
	clubName := "Verein"
	if err == nil {
		clubName = club.Club.Name
	}

	invitationURL := strings.TrimSuffix(s.baseURL, "/") + "/ui/invite/" + token
	if err := s.mailService.SendClubInvitationEmail(email, clubName, invitedByName, invitationURL); err != nil {
		return "", err
	}
	return token, nil
}

func (s *ClubInvitationService) GetInvitationByToken(token string) (*ClubInvitationDetails, error) {
	invitation, err := s.queries.FindClubInvitationByToken(s.ctx, token)
	if err != nil {
		return nil, err
	}

	clubRow, err := s.queries.FindClubByID(s.ctx, invitation.ClubID)
	if err != nil {
		return nil, err
	}

	var acceptedAt *time.Time
	if invitation.AcceptedAt.Valid {
		acceptedAt = &invitation.AcceptedAt.Time
	}

	return &ClubInvitationDetails{
		Token:        invitation.Token,
		ClubID:       invitation.ClubID,
		ClubName:     clubRow.Club.Name,
		InvitedEmail: invitation.InvitedEmail,
		ExpiresAt:    invitation.ExpiresAt.Time,
		AcceptedAt:   acceptedAt,
	}, nil
}

func (s *ClubInvitationService) AcceptInvitation(token string, userID string, userEmail string, clubService ClubService) error {
	invitation, err := s.queries.FindClubInvitationByToken(s.ctx, token)
	if err != nil {
		return err
	}

	if invitation.AcceptedAt.Valid {
		return errors.New("invitation already accepted")
	}
	if invitation.ExpiresAt.Valid && invitation.ExpiresAt.Time.Before(time.Now()) {
		return errors.New("invitation expired")
	}
	if !strings.EqualFold(invitation.InvitedEmail, userEmail) {
		return errors.New("invitation email does not match authenticated user")
	}

	if err := clubService.AddUserToClub(invitation.ClubID, userID, models.Member); err != nil {
		return err
	}

	return s.queries.MarkClubInvitationAccepted(s.ctx, db.MarkClubInvitationAcceptedParams{
		AcceptedAt: sql.NullTime{Time: time.Now(), Valid: true},
		Token:      token,
	})
}

func (s *ClubInvitationService) CompleteInvitationWithPassword(
	token string,
	password string,
	firstname string,
	lastname string,
	clubService ClubService,
	userService UserService,
	keycloakService KeycloakService,
) error {
	invitation, err := s.queries.FindClubInvitationByToken(s.ctx, token)
	if err != nil {
		return err
	}

	if invitation.AcceptedAt.Valid {
		return errors.New("invitation already accepted")
	}
	if invitation.ExpiresAt.Valid && invitation.ExpiresAt.Time.Before(time.Now()) {
		return errors.New("invitation expired")
	}

	normalizedEmail := strings.ToLower(strings.TrimSpace(invitation.InvitedEmail))
	if normalizedEmail == "" {
		return errors.New("invitation email is invalid")
	}

	_, userLookupErr := s.queries.FindUserByEmail(s.ctx, db.NewSQLNullString(normalizedEmail))
	if userLookupErr == nil {
		return errors.New("user for invitation email already exists, please login")
	}
	if userLookupErr != sql.ErrNoRows {
		return userLookupErr
	}

	userID, err := keycloakService.CreateInvitedUser(normalizedEmail, password, firstname, lastname)
	if err != nil {
		return err
	}

	createdUser := &models.User{
		UserId:           userID,
		Username:         normalizedEmail,
		SideBarCollapsed: false,
		Email:            normalizedEmail,
		Firstname:        strings.TrimSpace(firstname),
		Lastname:         strings.TrimSpace(lastname),
	}

	if err := userService.SaveUser(createdUser); err != nil {
		_ = keycloakService.DeleteUser(userID)
		return err
	}
	if err := userService.UpdateFromEndpoint(createdUser); err != nil {
		_ = keycloakService.DeleteUser(userID)
		return err
	}
	if err := clubService.AddUserToClub(invitation.ClubID, userID, models.Member); err != nil {
		return err
	}

	return s.queries.MarkClubInvitationAccepted(s.ctx, db.MarkClubInvitationAcceptedParams{
		AcceptedAt: sql.NullTime{Time: time.Now(), Valid: true},
		Token:      token,
	})
}
