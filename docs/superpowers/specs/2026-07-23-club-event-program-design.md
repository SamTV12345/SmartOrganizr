# Club Event Program (Programm / Setlist) — Design

**Date:** 2026-07-23
**Status:** Implemented (2026-07-23; migration `00031_club_event_program.sql`)

## Problem

A club event (`club_events`) needs an ordered **program** (setlist): the pieces
to be played, in order. SmartOrganizr already stores each user's sheet-music
("elements" of `type='note'`), so the program should be able to link an existing
note **and** carry a free-text title for pieces that aren't in the library (or
whose note gets deleted later). This is the Konzertmeister differentiator — it
has no real per-event program management.

## Scope

**In scope:**
- Ordered list of program entries per event.
- Each entry: optional `note_id` (nullable FK to `elements`), denormalized
  `title` (always present, survives note deletion), `position`, optional
  `duration_minutes`, optional `note_text` remark.
- Managers (event-management role: `LEITER` / `CO_LEITER`, same as club-events)
  edit; any club member may view.
- Note picker in the UI reuses the existing per-user note list endpoint
  (`GET /v1/elements/notes`).

**Out of scope:** per-entry PATCH/reorder endpoints (the program is replaced
wholesale), cross-user note sharing, printing/export.

## Data model

`00031_club_event_program.sql` — table `club_event_program`:

| column           | type          | notes                                            |
|------------------|---------------|--------------------------------------------------|
| id               | VARCHAR(36)   | PK                                               |
| event_id         | VARCHAR(36)   | FK → `club_events.id` ON DELETE CASCADE          |
| note_id          | VARCHAR(255)  | nullable FK → `elements.id` ON DELETE SET NULL   |
| title            | VARCHAR(255)  | denormalized, always set                         |
| position         | INT           | 0-based order                                    |
| duration_minutes | INT           | nullable                                         |
| note_text        | VARCHAR(500)  | nullable remark                                  |

`note_id` matches `elements.id` (varchar 255) and the table declares
`COLLATE=utf8mb4_general_ci` so both FKs hold (avoids MySQL error 3780).
Nullable `note_id` + `ON DELETE SET NULL` means deleting a library note leaves
the program row intact (title survives). Per house rules the nullable note is
**not** `sqlc.embed`ed — the program row is returned as-is; note details, if
ever needed, load separately by id.

## Endpoints (in the `v1/clubs` group)

- `GET  /v1/clubs/{clubId}/events/{eventId}/program` — ordered entries; any member.
- `PUT  /v1/clubs/{clubId}/events/{eventId}/program` — replace the whole program
  with an ordered array; manager only. Position is assigned by array order
  (client value ignored); empty-string `noteId` is stored as NULL.

Wholesale replace keeps the API tiny: add / reorder / edit / remove are all one
PUT. Delete-all + re-insert; not wrapped in a transaction (manager-only,
low-contention setlist) — `ponytail:` noted in the service.

## Permissions

Reuses `canManage` (Admin/CoAdmin) from the club-events service for writes;
`requireMember` for reads. Errors map through the shared `mapServiceError`
(403 for no-access / forbidden, 404 for missing event).

## UI

New "Programm" tab in `ClubDetailView` (`CLUB_SECTIONS` + one render block) →
`components/club/ClubProgramSection.tsx`. The tab lists the club's events
(reusing `GET /v1/clubs/{clubId}/events`); expanding one shows a `ProgramEditor`
that fetches the program, lets a manager add a library note (via the reused
note-list endpoint) or a free-text piece, reorder (up/down), set a duration,
remove, and Save (one PUT). Members see the list read-only.

## Test approach

- Go integration (`tests/club_event_program_test.go`): replace + list (note-linked
  + free-text, positions), reorder + remove, and non-manager 403 / member-view.
- Playwright (`e2e/club-program.spec.ts`): mocks the club/permissions/events/note
  endpoints, opens the Programm tab, adds a library note + a free-text piece,
  reorders, removes, saves, and asserts the PUT body.
