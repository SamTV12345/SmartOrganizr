# Native Club Events + RSVP + Attendance — Design

**Date:** 2026-05-29
**Status:** Approved (pending spec review)

## Goal

Make SmartOrganizr a viable self-hostable Konzertmeister alternative by adding a
**native, club-scoped event system with member RSVP and an attendance view**.
Today events are only a read-only mirror of an external iCal feed (per user, no
RSVP persistence). This spec adds events that the club *owns* and members can
respond to — while keeping the existing feed sync fully intact for clubs that
have not switched.

## Scope

**In scope (this spec):**
- Native club-scoped events: create / edit / soft-cancel / delete.
- Member responses: Yes / No / Maybe (+ optional reason). Undecided = no response yet.
- Attendance view (matrix + aggregate counts), gated by configurable visibility.
- Role-based event-management permission.
- Notifications on event create, cancel, and member response.
- UI: a `[ Feed | Club ]` toggle container in "My dates", plus event management
  inside the club detail page.

**Out of scope (future specs):**
- **Sections / registers** (instrument groups: flutes, clarinets, …) and
  section-targeted events. This is the planned *next* feature; it will activate
  the reserved `SECTION_MANAGERS` visibility level.
- Recurrence (RRULE) on native events.
- Substitutes / external musicians per event.
- Outbound `.ics` feed of native events.
- Polls, tasks, SMS.

## Chosen approach: Approach A — separate tables

Native events live in **new tables** (`club_events`, `club_event_response`). The
existing `events` table (user-scoped feed mirror) and the iCal sync are **not
touched**. The two sources stay separate at the storage layer and are presented
in two separate UI sections — no union logic.

Rationale: zero risk to the working feed sync; models events at the correct
(club) scope from day one; matches the two-section UI decision. Rejected:
extending the `events` table (it is `user_id_fk`-scoped and its `REPLACE INTO`
sync could clobber native rows) and a polymorphic calendar abstraction (YAGNI).

## Data model

New migration `00023_club_events.sql` (5-digit padding — required for sqlc
ordering; see project memory `sqlc-broken-migration-padding`). Queries go in
`data/sql/queries/query.sql`; types are sqlc-generated into `db/`. **No
hand-written `db/*_queries.go`** (project standard `sqlc-standard-not-handwritten`).

### `club_events`
| column | type | notes |
|---|---|---|
| `id` | varchar PK | UUID string |
| `club_id` | varchar, FK → `clubs.id` | club-scoped, indexed |
| `summary` | varchar, not null | title |
| `description` | text, null | |
| `location` | varchar, null | |
| `geo_date_x` | double, null | map parity with `events` |
| `geo_date_y` | double, null | |
| `event_type` | varchar, not null | `REHEARSAL` \| `CONCERT` \| `OTHER` |
| `start_date` | datetime, not null | |
| `end_date` | datetime, null | |
| `cancelled` | tinyint(1), default 0 | soft-cancel keeps history + enables notify |
| `created_by_user_id` | varchar, FK → `users.id` | |
| `created_at` | datetime, not null | |
| `updated_at` | datetime, not null | |

Index: `(club_id, start_date)` for the listing queries.

### `club_event_response`
| column | type | notes |
|---|---|---|
| `event_id` | varchar, FK → `club_events.id` ON DELETE CASCADE | |
| `user_id` | varchar, FK → `users.id` | |
| `status` | varchar, not null | `YES` \| `NO` \| `MAYBE` |
| `reason` | varchar, null | optional, any status |
| `responded_at` | datetime, not null | |
| PK | (`event_id`, `user_id`) | one response per member per event |

**Key decision — Undecided = absence of a row.** A member who has not answered
has no `club_event_response` row. The attendance view derives "undecided" as
(club members) − (members with a row). No backfill of placeholder rows.

`ON DELETE CASCADE` on `event_id`: a hard delete removes responses; a soft-cancel
(`cancelled=1`) keeps both event and responses.

## Permissions

Add a derived capability `CanManageEvents bool` to `ClubPermissionsDto`
(`json:"can_manage_events"`), computed from `ClubParticipant.Role` using the
same role→capability logic as the existing `CanManageRoles` / `CanInviteMember`.

- Create / edit / cancel / delete: require `CanManageEvents` → else HTTP 403.
- Responding to an event: any club member.
- All checks enforced in the service layer, never trusted from the client.

## Visibility

Reuse the existing `Club.FeedbackVisibility` (response statuses) and
`Club.ReasonVisibility` (reasons) string columns as enums, configurable per club:

| value | meaning |
|---|---|
| `ALL_MEMBERS` | (default) everyone sees the full matrix |
| `MANAGERS_ONLY` | only `CanManageEvents` holders see others; members see own + aggregate counts |
| `SELF_ONLY` | members see only their own; managers see all |
| `SECTION_MANAGERS` | **reserved — not implemented this spec.** Treated as `MANAGERS_ONLY` until the sections model lands (`// TODO: sections`). |

The attendance endpoint applies this server-side: it filters which response rows
(and which reasons) a caller may see based on their capability and the club's
two visibility settings independently (a club may show statuses to all but
reasons to managers only).

## API endpoints

Convention follows existing `/v1/clubs/{clubId}/...` routes. Controllers handle
HTTP + validation; services hold logic and permission/visibility checks; sqlc
queries in `query.sql`; DTOs in `controllers/dto`; mappers in `mappers/`. Swagger
annotations regenerate the UI's `schema.ts` via the `gen:api` npm script.

| Method | Path | Who | Purpose |
|---|---|---|---|
| `GET` | `/v1/clubs/{clubId}/events?since=` | members | List club events + caller's own response + aggregate counts |
| `POST` | `/v1/clubs/{clubId}/events` | manage | Create event |
| `GET` | `/v1/clubs/{clubId}/events/{eventId}` | members | Event detail |
| `PUT` | `/v1/clubs/{clubId}/events/{eventId}` | manage | Edit |
| `POST` | `/v1/clubs/{clubId}/events/{eventId}/cancel` | manage | Soft-cancel (`cancelled=1`) |
| `DELETE` | `/v1/clubs/{clubId}/events/{eventId}` | manage | Hard delete (cascades responses) |
| `PUT` | `/v1/clubs/{clubId}/events/{eventId}/response` | members | Upsert own response `{status, reason}` |
| `GET` | `/v1/clubs/{clubId}/events/{eventId}/attendance` | gated | Full matrix (responses + undecided), visibility-filtered |
| `GET` | `/v1/club-events?since=` | members | All native events across the caller's clubs (feeds the "Club" toggle section) |

Response upsert uses `INSERT ... ON DUPLICATE KEY UPDATE` (MySQL) so insert and
update collapse to one row.

## Notifications

Extend the existing in-process SSE `NotificationHub` (transient pub/sub keyed by
userID; dropped if a client is offline — clients re-sync via REST, same pattern
as pinboard/chat).

- Add an `EventID string \`json:"eventId,omitempty"\`` field to `NotificationEvent`.
- Add `Type` values: `CLUB_EVENT_CREATED`, `CLUB_EVENT_CANCELLED`,
  `CLUB_EVENT_RESPONSE`.
- On **create** and **cancel**: publish to every club member's userID.
- On member **response**: publish to every member holding `CanManageEvents`.

Recipient lists come from the existing club-members query.

## Read integration & UI

- **`events` table + feed sync: zero changes.** The "Feed" section keeps using
  `GET /v1/events/{userId}` as today.
- **My-dates container:** a segmented toggle `[ Feed | Club ]`.
  - Feed → existing `EventView` list, read-only, unchanged.
  - Club → events from `GET /v1/club-events`, each with RSVP controls
    (Yes / No / Maybe) + optional reason; chosen status persists and renders via
    the existing `convertStatusModelToIcon`.
- **Club detail page:** an "Events" area where managers create/edit/cancel events
  and view the attendance matrix.
- Reuse `EventCard`; add a response-control footer (native events only) and a
  small source badge. This also fixes the currently-cosmetic RSVP buttons by
  giving them a real persistence target.

## Testing

Go tests matching the `tests/` patterns (testcontainers / MySQL):
- **Permission gating:** non-managers receive 403 on create / edit / cancel / delete.
- **Response upsert:** insert then update collapses to a single row; reason persists and can be cleared.
- **Visibility:** `MANAGERS_ONLY` and `SELF_ONLY` hide others' rows/reasons for
  non-managers; `ALL_MEMBERS` shows them; `SECTION_MANAGERS` behaves as
  `MANAGERS_ONLY` for now.
- **Attendance aggregation:** undecided = members with no row; yes/no/maybe counts correct.
- **Lifecycle:** soft-cancel keeps the event row + responses; hard delete cascades responses.
- **Notifications:** create/cancel publish to members; response publishes to managers.

## Risks / notes

- `SECTION_MANAGERS` visibility is defined but inert until the sections spec; the
  fallback to `MANAGERS_ONLY` must be explicit and tested so it is never a silent gap.
- The cross-club `GET /v1/club-events` must scope strictly to the caller's club
  memberships to avoid leaking other clubs' events.
- Keep the feed mirror and native events visually labelled so members never
  confuse a read-only synced item with one they can RSVP to.

## Recurrence (2026-07-12)

Recurring events (Serientermine) shipped as a pragmatic materialized-series v1
— no virtual RRULE expansion:

- `club_events.series_id` (nullable `varchar(36)`, indexed; migration
  `00030_club_event_series.sql`). Occurrences are ordinary, fully independent
  event rows that merely share a `series_id` UUID.
- `POST /v1/clubs/{clubId}/events` accepts an optional
  `repeat: {frequency: WEEKLY|BIWEEKLY|MONTHLY, until: RFC3339}`. The server
  validates `until > startDate`, expands occurrences (WEEKLY +7d, BIWEEKLY
  +14d, MONTHLY +1 calendar month via Go `AddDate`; `until` inclusive), keeps
  the start/end duration per occurrence, and hard-caps a series at 52
  occurrences (400 above that). Members are notified ONCE per series, not per
  occurrence. Section targeting applies to every occurrence.
- `DELETE /v1/clubs/{clubId}/events/{eventId}/series` (manager only) deletes
  ALL occurrences of the event's series; 400 if the event has no series.
- `ClubEventDto` exposes `seriesId` so clients can badge occurrences and offer
  series deletion.

**Limitation (by design):** update and cancel remain single-event operations —
editing or cancelling one occurrence never touches its siblings, and there is
no "edit whole series". RSVPs are per occurrence. Series-wide editing is
possible future work on top of the shared `series_id`.
