# Feature A — Club Pinn Wall (Pinnwand) Design

Date: 2026-05-28
Status: Approved (design), pending spec review

## Purpose

Give each club a notice board ("Pinnwand") where authorized members post news and
announcements. Members read; roles with `pinnwand` section-write create/edit/delete.
A cross-club "recent posts" feed powers the dashboard (Feature D).

## Scope (YAGNI)

In scope: posts with title + body, optional "pinned" flag, author + timestamps,
per-club list, cross-club recent feed, create/edit/delete with permission gating.

Out of scope (deliberately): comments, reactions, attachments, rich text/markdown,
read receipts on posts. Can be added later without schema rework.

## Data Model

New Goose migration `data/sql/migrations/0000020_club_pinboard.sql` (next free
number; B uses 0000021, C uses 0000022 — assigned up front to avoid cross-track
collisions):

```sql
-- +goose Up
CREATE TABLE club_pinboard_post (
    id             VARCHAR(36)  NOT NULL,
    club_id        VARCHAR(255) NOT NULL,
    author_user_id VARCHAR(255) NOT NULL,
    title          VARCHAR(500) NOT NULL,
    body           TEXT         NOT NULL,
    pinned         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY club_pinboard_club_idx (club_id, pinned, created_at),
    CONSTRAINT club_pinboard_fk_club FOREIGN KEY (club_id) REFERENCES clubs (id) ON DELETE CASCADE,
    CONSTRAINT club_pinboard_fk_author FOREIGN KEY (author_user_id) REFERENCES user (id) ON DELETE CASCADE
) COLLATE = utf8mb4_general_ci;

-- +goose Down
DROP TABLE club_pinboard_post;
```

Data layer uses **sqlc** — the project standard. Add queries to
`data/sql/queries/query.sql` with `-- name: … :one|:many|:exec` annotations, then run
`sqlc generate` (v1.28.0) from `api_go/` to regenerate `db/query.sql.go` +
`db/models.go` (generated — never hand-edit; do NOT follow the `chat_queries.go`
hand-written pattern, which is legacy debt). Queries:

- `-- name: CreatePinboardPost :exec`
- `-- name: UpdatePinboardPost :exec`
- `-- name: DeletePinboardPost :exec`
- `-- name: GetPinboardPost :one`
- `-- name: ListPinboardPostsForClub :many` — ORDER BY pinned DESC, created_at DESC;
  join `user` for author display name → sqlc emits a `ListPinboardPostsForClubRow`.
- `-- name: ListRecentPinboardPostsForUser :many` — join `club_participant` (on the
  user) + `clubs` (for clubName), newest N across all the user's clubs; takes the
  user id and a `LIMIT ?`.

The service layer consumes the generated structs/methods (`c.queries.ListPinboardPostsForClub(ctx, ...)`).

## API Contract

Base: handlers in new `controllers/pinboard.go`, service `service/pinboardService.go`,
queries `db/pinboard_queries.go`. Routes registered in `routers/setupRouter.go` under
the existing `v1/clubs` group + a new entry under `v1/users`.

DTO `dto.PinboardPostDto`:
```
id          string
clubId      string
clubName    string   // populated only in the recent-feed response; "" otherwise
authorId    string
authorName  string
title       string
body        string
pinned      bool
createdAt   string   // RFC3339
updatedAt   string   // RFC3339
```

DTO `dto.PinboardPostUpsertDto`: `{ title string, body string, pinned bool }`

| Method | Path | Handler | Auth/gate | Returns |
|---|---|---|---|---|
| GET | `/v1/clubs/{clubId}/pinboard` | `GetClubPinboard` | club member | `[]PinboardPostDto` |
| POST | `/v1/clubs/{clubId}/pinboard` | `CreateClubPinboardPost` | section `pinnwand` write | `PinboardPostDto` |
| PATCH | `/v1/clubs/{clubId}/pinboard/{postId}` | `UpdateClubPinboardPost` | section `pinnwand` write | `PinboardPostDto` |
| DELETE | `/v1/clubs/{clubId}/pinboard/{postId}` | `DeleteClubPinboardPost` | section `pinnwand` write | 204 |
| GET | `/v1/users/{userId}/pinboard/recent?limit=10` | `GetRecentPinboardForUser` | userId == caller | `[]PinboardPostDto` (clubName populated) |

**Contract consumed by Dashboard (D):** `GET /v1/users/{userId}/pinboard/recent`
returns newest posts across the caller's clubs, each with `clubId`, `clubName`,
`title`, `authorName`, `createdAt`. Default limit 10, max 50.

Permission gating reuses the existing membership lookup + `canWriteSection(role,
"pinnwand")` logic in `clubs.go` (Admin/CoAdmin/Secretary/Treasurer may write).
Edit/delete additionally require the post belong to `clubId`; any writer may edit any
post (club-level board, not per-author ownership) — matches how a notice board works.

**Real-time hook (depends on C):** after a successful create, publish a
notification event to all *other* club members via the SSE hub from Feature C:
`{ type: "pinboard_post", clubId, postId, preview: title }`. If C is not yet merged,
guard the publish behind the hub being present (nil-check) so A is independently
mergeable.

## Backend Tests

`tests/pinboard_test.go` using `SetupTest(t)` + `app.Test(...)`:
- create post as admin → 200, appears in club list
- list as member → includes post
- create as plain member → 403 (no `pinnwand` write)
- recent feed returns post with clubName populated
- delete → 204, gone from list

## Frontend

Regenerate types: `npm run gen:api`.

`pages/ClubDetailView.tsx`: replace the disabled "Pinnwand" placeholder section with a
real panel:
- `$api.useQuery("get", "/v1/clubs/{clubId}/pinboard", ...)` → list of post cards
  (pinned cards first, badge for pinned, author + relative date via `date-fns`).
- "Beitrag erstellen" button (visible only when `permissions.section_write.pinnwand`)
  opens a create/edit dialog (new `components/PinboardPostDialog.tsx`) with title + body
  fields (`react-hook-form` + `zod`, matching existing form patterns).
- Each card: edit + delete actions when writable; delete confirms inline.
- Mutations invalidate the pinboard query key on success.

New small component `components/PinboardPostCard.tsx` for a single post (keeps
ClubDetailView from growing further).

i18n: add keys to `language/json/de.json` + `en.json`:
`pinboard.title`, `pinboard.create`, `pinboard.empty`, `pinboard.pinned`,
`pinboard.field.title`, `pinboard.field.body`, `pinboard.delete-confirm`,
`pinboard.edit`, `pinboard.delete`.

## Integration / Merge

Independent track. Conflicts only on generated `schema.ts`/`swagger.json` — regen on
master after merge. Sidebar `/clubOverview` etc. untouched here.
