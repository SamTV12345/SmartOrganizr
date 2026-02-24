package service

import (
	"api_go/controllers/dto"
	"api_go/mappers"
	"api_go/models"
	"context"
	"github.com/Nerzal/gocloak/v13"
	"go.uber.org/zap"
	"strings"
)

type KeycloakService struct {
	Realm   string
	Token   *models.MutexedKeycloakToken
	Client  *gocloak.GoCloak
	context context.Context
	sugar   *zap.SugaredLogger
}

func NewKeycloakService(realm string, token *models.MutexedKeycloakToken, client *gocloak.GoCloak) KeycloakService {
	logger, _ := zap.NewProduction()
	defer logger.Sync() // flushes buffer, if any
	sugar := logger.Sugar()
	return KeycloakService{
		Realm:   realm,
		Token:   token,
		Client:  client,
		context: context.Background(),
		sugar:   sugar,
	}
}

var DefaultKeycloakRoles = []string{
	"access",
}

func (kc *KeycloakService) CreateUser(user models.User, model dto.KeycloakModel) error {
	var clientRolesToAssign = make(map[string][]string)
	clientRolesToAssign[model.ClientId] = DefaultKeycloakRoles

	kc.Token.Mu.Lock()
	defer kc.Token.Mu.Unlock()

	var enabled = true
	var _, err = kc.Client.CreateUser(kc.context, kc.Token.Jwt.AccessToken, kc.Realm, gocloak.User{
		Username:    &user.Username,
		Email:       &user.Email,
		FirstName:   &user.Firstname,
		LastName:    &user.Lastname,
		Enabled:     &enabled,
		ClientRoles: &clientRolesToAssign,
	})
	if err != nil {
		return err
	}
	return nil
}

func (kc *KeycloakService) UpdateUser(user models.User) error {
	kc.Token.Mu.Lock()
	defer kc.Token.Mu.Unlock()
	userFromKeycloak, err := kc.Client.GetUserByID(kc.context, kc.Token.Jwt.AccessToken, kc.Realm, user.UserId)
	if err != nil {
		return err
	}
	userFromKeycloak = mappers.ConvertKeycloakUserWithSmartOrganizrUser(*userFromKeycloak, &user)

	err = kc.Client.UpdateUser(kc.context, kc.Token.Jwt.AccessToken, kc.Realm, *userFromKeycloak)
	if err != nil {
		kc.sugar.Warnf("Error updating user with id %s: %v", user.UserId, err)
		return err
	}
	return nil
}

func (kc *KeycloakService) CreateInvitedUser(email string, password string, firstname string, lastname string) (string, error) {
	kc.Token.Mu.Lock()
	defer kc.Token.Mu.Unlock()

	enabled := true
	emailVerified := true
	credentialType := "password"
	username := strings.ToLower(strings.TrimSpace(email))
	credentials := []gocloak.CredentialRepresentation{
		{
			Type:      gocloak.StringP(credentialType),
			Value:     gocloak.StringP(password),
			Temporary: gocloak.BoolP(false),
		},
	}

	userID, err := kc.Client.CreateUser(kc.context, kc.Token.Jwt.AccessToken, kc.Realm, gocloak.User{
		Username:      gocloak.StringP(username),
		Email:         gocloak.StringP(email),
		FirstName:     gocloak.StringP(strings.TrimSpace(firstname)),
		LastName:      gocloak.StringP(strings.TrimSpace(lastname)),
		Enabled:       gocloak.BoolP(enabled),
		EmailVerified: gocloak.BoolP(emailVerified),
		Credentials:   &credentials,
	})
	if err != nil {
		return "", err
	}
	return userID, nil
}

func (kc *KeycloakService) DeleteUser(userID string) error {
	kc.Token.Mu.Lock()
	defer kc.Token.Mu.Unlock()
	return kc.Client.DeleteUser(kc.context, kc.Token.Jwt.AccessToken, kc.Realm, userID)
}
