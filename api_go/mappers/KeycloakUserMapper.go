package mappers

import (
	"api_go/models"
	"github.com/Nerzal/gocloak/v13"
)

func ConvertKeycloakUserWithSmartOrganizrUser(keycloakUser gocloak.User, smartOrganizrUser *models.User) *gocloak.User {
	keycloakUser.Username = &smartOrganizrUser.Username
	keycloakUser.FirstName = &smartOrganizrUser.Firstname
	keycloakUser.LastName = &smartOrganizrUser.Lastname
	keycloakUser.Email = &smartOrganizrUser.Email
	if keycloakUser.Attributes == nil {
		attributes := make(map[string][]string)
		keycloakUser.Attributes = &attributes
	}
	if smartOrganizrUser.TelephoneNumber != "" {
		(*keycloakUser.Attributes)["telephoneNumber"] = []string{smartOrganizrUser.TelephoneNumber}
	} else {
		delete(*keycloakUser.Attributes, "telephoneNumber")
	}
	return &keycloakUser
}
