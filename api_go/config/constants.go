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

// AI service — used for the vision-based "identify a piece from a photo of
// the score" flow. Targets any OpenAI-compatible chat completions endpoint;
// defaults to Mistral La Plateforme. Empty token -> the endpoint returns 503
// so the rest of the app stays usable.
const AIBaseURL = "ai.base_url"
const AIToken   = "ai.token"
const AIModel   = "ai.model"
