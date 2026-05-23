package dto

type KeycloakModel struct {
	ClientId string `json:"clientId"`
	Url      string `json:"url"`
	Realm    string `json:"realm"`
}
