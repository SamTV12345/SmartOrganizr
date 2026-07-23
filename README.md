# <img src="ui/public/package.svg" style="color: black;"/> SmartOrganizr

SmartOrganizr is a self-hostable web app that makes the life of musicians and
music clubs easier — a lightweight, open alternative to Konzertmeister. It
combines a personal sheet-music library with full club/ensemble management.

## Features

**Sheet-music library**
- Manage musical notation (notes) with composer/arranger metadata, sorted into folders.
- Manage artists/authors and keep track of who wrote or arranged which piece.
- Inventory sweeps (Inventur): reconcile physical folders via a camera flow.

**Club / ensemble management**
- Clubs (Vereine) with members, roles (Leiter, Co-Leiter, Schriftführer, …) and
  instrument sections (Register).
- Member invitations (incl. public self-service invite links) and CSV import/export.
- Events (Termine): rehearsals & concerts with RSVP, attendance, recurring series
  (Serientermine), and an ICS calendar feed.
- **Programm** — link library notes to an event as an ordered setlist.
- **Abwesenheiten** — members declare unavailable date ranges; events show expected attendance.
- **Anwesenheitsstatistik** — per-member and per-section attendance rates.
- **Umfragen** — polls/surveys with single- or multiple-choice voting.
- Pinboard (Pinnwand), file sharing, real-time chat, and SSE notifications.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Go (`api_go/`), [Fiber v3](https://gofiber.io), [sqlc](https://sqlc.dev) for the DB layer, [goose](https://github.com/pressly/goose) migrations |
| Frontend | React + TypeScript (`ui/`), [rsbuild](https://rsbuild.dev), TanStack Query, [pnpm](https://pnpm.io) |
| Database | MariaDB / MySQL |
| Auth | Keycloak (OIDC) |
| API contract | Swagger (`swag`) → OpenAPI → typed client (`openapi-typescript`) |

## Running with Docker

The published image plus a database is the quickest way to self-host. Helper
compose files for the supporting services live in the repo root
(`docker-mysql.yaml`, `docker-keycloak.yaml`, `docker-mailpit.yaml`), and
`realm-export.json` bootstraps a ready-made Keycloak realm.

1. Start MariaDB and Keycloak (e.g. `docker compose -f docker-mysql.yaml -f docker-keycloak.yaml up -d`).
2. Import `realm-export.json` into Keycloak (or point the app at your own realm/client).
3. Run the SmartOrganizr backend, configured via environment variables (see below).
4. Open `http://<your-host>:8080/ui`.

## Development

### Prerequisites
- Go 1.26+
- Node 20+ and pnpm
- MariaDB and Keycloak (use the `docker-*.yaml` helpers above)

### Backend (`api_go/`)
Configuration is read (in order) from real environment variables, a `.env` /
`config.env` file, or built-in defaults, via Viper. Env vars use the
`SMARTORGANIZR_` prefix with `.` replaced by `_`:

| Key | Env var | Default |
|---|---|---|
| `database.host` | `SMARTORGANIZR_DATABASE_HOST` | `localhost` |
| `database.port` | `SMARTORGANIZR_DATABASE_PORT` | `3306` |
| `database.user` / `database.password` / `database.database` | `SMARTORGANIZR_DATABASE_*` | `smartOrganizr` |
| `app.port` | `SMARTORGANIZR_APP_PORT` | `8080` |
| `sso.issuer` | `SMARTORGANIZR_SSO_ISSUER` | `http://localhost/realms/smartOrganizr` |
| `sso.url` / `sso.realm` / `sso.client_id` / `sso.frontend_client_id` | `SMARTORGANIZR_SSO_*` | see `api_go/config/AppConfig.go` |

```bash
cd api_go
go run .            # migrations (goose) run automatically on startup
```

Regenerate the DB layer after editing `data/sql/queries/query.sql` or migrations:

```bash
cd api_go && sqlc generate
```

### Frontend (`ui/`)
```bash
cd ui
pnpm install
pnpm dev            # https://localhost:5173/ui  (proxies /api and /public to :8080)
```

The dev server serves over HTTPS with a self-signed cert (required so
keycloak-js has Web Crypto when accessed off-localhost).

### Regenerating the API client
The typed client is generated from the backend's Swagger annotations:

```bash
cd api_go && swag init          # regenerate docs/swagger.json
cd ../ui  && pnpm gen:api       # swagger.json → openapi.json → src/api/schema.ts
```

### Tests
```bash
cd api_go && go test ./tests/...   # integration tests (testcontainers — needs Docker)
cd ui     && pnpm test             # unit tests (vitest)
cd ui     && pnpm e2e              # end-to-end (Playwright; mocks the backend + Keycloak)
```

If you face any problem you can open an issue on
[GitHub](https://github.com/SamTV12345/SmartOrganizr/issues).

## License

SmartOrganizr is licensed under the [MIT License](LICENSE).
