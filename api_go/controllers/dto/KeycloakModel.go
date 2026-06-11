package dto

type KeycloakModel struct {
	ClientId  string `json:"clientId"  validate:"required"`
	Url       string `json:"url"       validate:"required"`
	Realm     string `json:"realm"     validate:"required"`
	AiEnabled bool   `json:"aiEnabled"`
}
