# Feature C — Messaging Real-time + Unread Design

Date: 2026-05-28
Status: Approved (design), pending spec review

## Purpose

Messaging (1:1 club chats) is already functional via REST polling. This adds:
1. Real-time delivery via **SSE** (Server-Sent Events) — new messages and pinboard
   posts pushed to connected clients without refresh.
2. Unread tracking — per-chat unread counts and a global unread summary for the
   sidebar badge and the dashboard.

## Approach Decision

**SSE over WebSocket.** Fiber v3 streams responses natively (no new dependency; no
WS lib compatible with Fiber v3 is installed). Notifications are one-directional
server→client, which SSE fits exactly. The browser's native `EventSource` cannot send
the Keycloak `Authorization` header, so the frontend consumes the stream via
**fetch + ReadableStream** (can set the bearer header) with manual reconnect/backoff.

## Data Model

New Goose migration `data/sql/migrations/0000022_club_chat_read.sql` (A uses 0000020,
B uses 0000021):

```sql
-- +goose Up
CREATE TABLE club_chat_read (
    chat_id      VARCHAR(36)  NOT NULL,
    user_id      VARCHAR(255) NOT NULL,
    last_read_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (chat_id, user_id),
    CONSTRAINT club_chat_read_fk_chat FOREIGN KEY (chat_id) REFERENCES club_chat (id) ON DELETE CASCADE,
    CONSTRAINT club_chat_read_fk_user FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE
) COLLATE = utf8mb4_general_ci;

-- +goose Down
DROP TABLE club_chat_read;
```

Data layer uses **sqlc** (project standard) — add to `data/sql/queries/query.sql` with
`-- name:` annotations, then `sqlc generate` (v1.28.0) regenerates `db/query.sql.go` +
`db/models.go` (never hand-edit; do NOT copy the legacy `chat_queries.go` style, even
though the existing chat read-paths live there — the *new* read-tracking queries are
sqlc). Queries:

- `-- name: UpsertChatRead :exec` — INSERT ... ON DUPLICATE KEY UPDATE last_read_at =
  VALUES(last_read_at).
- `-- name: CountUnreadForChat :one` — messages in chat with created_at > last_read_at
  AND sender != me; LEFT JOIN club_chat_read so a missing read row counts all messages.
- `-- name: CountUnreadForUserByClub :many` — grouped unread totals across the user's
  clubs (join club_chat + club_chat_message + club_chat_read + clubs for clubName).

Note: the existing `GetClubChats` path is hand-written in `db/chat_queries.go`. To add
`unreadCount` to its result, add a sqlc `CountUnreadForChat` call in the *service* layer
(loop over chats) rather than editing the hand-written query — keeps new code on sqlc
and avoids touching legacy SQL.

## SSE Hub (in-process)

New `service/notificationHub.go`: an in-memory pub/sub.
- `Subscribe(userId) (chan Event, unsubscribe func())` — registers a buffered channel.
- `Publish(userId string, event Event)` — non-blocking send to all that user's channels
  (drop if buffer full to avoid blocking; client will re-sync via REST on reconnect).
- Thread-safe via `sync.RWMutex`; map `userId -> set of channels`.
- `Event` = `{ Type string; ClubID string; ChatID string; PostID string; Preview string }`.

The hub is created once in `setupRouter.go` and injected into the message service and
pinboard service (via `SetLocal`/constructor) so they can `Publish` on new
message/post. The hub is a singleton shared across requests.

## API Contract

Handlers in new `controllers/notifications.go` + additions to `messages.go`.

| Method | Path | Handler | Behavior |
|---|---|---|---|
| GET | `/v1/notifications/stream` | `StreamNotifications` | SSE; keeps connection open, writes `data: <json>\n\n` per event + periodic `:keepalive` comment every ~25s |
| GET | `/v1/notifications/unread-summary` | `GetUnreadSummary` | `UnreadSummaryDto` |
| PATCH | `/v1/clubs/{clubId}/messages/chats/{chatId}/read` | `MarkChatRead` | upsert last_read_at = now; 204 |

SSE implementation: use Fiber v3 `c.SendStreamWriter(func(w *bufio.Writer){...})` with
headers `Content-Type: text/event-stream`, `Cache-Control: no-cache`,
`Connection: keep-alive`. Loop on the subscriber channel + a keepalive ticker + the
request context Done channel; unsubscribe on disconnect.

DTO `dto.UnreadSummaryDto`:
```
total   int
byClub  []{ clubId string; clubName string; unread int }
```

**Augment existing** `GetClubChats` → add `unreadCount int` to `ClubChatSummaryDto`
(computed via `CountUnreadForChat`). This is additive; existing frontend keeps working.

**Publish points:**
- `PostMessage` / `CreateChat` (message service): after persisting, `hub.Publish(recipientUserId, {Type:"message", ClubID, ChatID, Preview: content})`.
- Pinboard create (Feature A): publishes `{Type:"pinboard_post", ...}` to other members.

**Contract consumed by Dashboard (D):** `GET /v1/notifications/unread-summary` →
`{ total, byClub[] }`.

## Backend Tests

`tests/notifications_test.go`:
- post a message, then `unread-summary` for recipient shows total >= 1
- `mark read`, then unread-summary returns 0 for that chat
- `GetClubChats` includes `unreadCount`
- SSE endpoint: connect, publish via service, assert the event is received (use a
  short-timeout read on `app.Test` with a streaming response, or test the hub's
  Subscribe/Publish directly as a unit test — hub unit test is the reliable path;
  add an integration smoke test if feasible).

## Frontend

Regenerate types: `npm run gen:api`.

New `src/notifications/NotificationProvider.tsx` (mounted high in `App.tsx`, inside
auth):
- On mount (authenticated), opens `/v1/notifications/stream` via `authFetch` +
  `ReadableStream` reader, parses SSE frames, and on each event invalidates the
  relevant React Query keys (chats list, unread-summary, chat messages) so the UI
  refreshes. Reconnect with exponential backoff on stream end/error.
- Exposes unread totals via a small zustand store or React context for badges.

`components/layout/SideBar.tsx`: show an unread badge on the "My Messages" entry
(and per-club if convenient) driven by `unread-summary`.

`pages/MyMessagesView.tsx`:
- On opening a chat, call `PATCH .../read`, then refetch unread-summary + chats.
- Show per-chat unread badge from `unreadCount`.
- With SSE invalidation, the manual refetch-after-mutation still works; SSE just makes
  the *other* participant's view update live.

i18n keys: `messages.unread` (if needed for tooltips). Most is numeric badges.

## Integration / Merge

Independent track, but provides the hub that A's create-post publishes to and the
unread-summary D consumes. Merge before D. A's publish call is nil-guarded so A can
merge first if needed. Conflicts: generated types, plus `messages.go`/`setupRouter.go`
(additive). `ClubChatSummaryDto` change is additive.
