package dto

type KeycloakModel struct {
	ClientId string          `json:"clientId"`
	Url      string          `json:"url"`
	Realm    string          `json:"realm"`
	Links    map[string]Link `json:"_links"`
}
