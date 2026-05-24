package config

const DatabaseHost = "database.host"
const AppURL = "app.url"
const DatabasePort = "database.port"
const DatabaseUser = "database.user"
const DatabaseDatabase = "database.database"
const DatabasePassword = "database.password"
const AppPort = "app.port"
const AppMode = "app.mode"

const SSOIssuer = "sso.issuer"
const SSOClientID = "sso.client_id"
const SSOClientSecret = "sso.client_secret"
const SSOFrontendClientID = "sso.frontend_client_id"
const SSOUrl = "sso.url"
const SSORealm = "sso.realm"

const SSORefreshInternal = "sso.refresh_interval"

const SMTPHost = "smtp.host"
const SMTPPort = "smtp.port"
const SMTPUsername = "smtp.username"
const SMTPPassword = "smtp.password"
const SMTPFromAddress = "smtp.from_address"
const SMTPEnabled = "smtp.enabled"

// Infomaniak AI Tools / Euria — used for the vision-based "identify a piece
// from a photo of the score" flow. The token is created in the Infomaniak
// manager under AI Tools (separate from the SSO client credentials). When
// the token is empty the endpoint returns 503 so the rest of the app stays
// usable.
const InfomaniakAIBaseURL   = "infomaniak.ai.base_url"
const InfomaniakAIToken     = "infomaniak.ai.token"
const InfomaniakAIProductID = "infomaniak.ai.product_id"
const InfomaniakAIModel     = "infomaniak.ai.model"
