package service

import (
	"api_go/controllers/dto"
	"api_go/mappers"
	"api_go/models"
	"context"
	"github.com/Nerzal/gocloak/v13"
	"go.uber.org/zap"
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
