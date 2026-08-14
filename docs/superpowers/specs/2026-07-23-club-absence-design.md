# Club Absence / Availability Management (Abwesenheiten) — Design

**Date:** 2026-07-23
**Status:** Implemented (2026-07-23; migration `00032_club_absence.sql`)

## Goal

Deliver the Konzertmeister staple that was missing: members declare date
ranges they are **unavailable**, and club events surface an **expected
attendance** derived from those absences. This augments the existing RSVP flow
(`club_event_response`) without changing it — an explicit RSVP always wins over
an inferred absence.

## Scope

**In scope:**
- Per-club member absences: a range `start_date`..`end_date` with an optional
  `reason`. A member manages their **own** absences (create / list / delete).
- Leaders (LEITER / CO_LEITER) get a **club-wide overview** of everyone's
  absences.
- An **availability endpoint** per event: for each member it reports inferred
  availability so the UI can show "expected X / Y". Precedence: explicit RSVP →
  overlapping absence → assumed present.
- UI: a new "Abwesenheiten" tab in the club detail page — own-absence CRUD with
  native `<input type="date">`, plus a leaders' overview.

**Out of scope (future):**
- Section-scoped availability (the availability endpoint counts all members).
- Leaders editing/deleting other members' absences.
- Half-day / time-of-day granularity (ranges are whole calendar days).
- Wiring "expected X/Y" badges into the events tab (endpoint exists; the UI
  hook is left minimal per the brief).

## Data model

Migration `00032_club_absence.sql`:

### `club_absence`
| column | type | notes |
|---|---|---|
| `id` | varchar(36) PK | UUID |
| `club_id` | varchar(255) FK → clubs, ON DELETE CASCADE | |
| `user_id` | varchar(255) FK → user, ON DELETE CASCADE | |
| `start_date` | date not null | inclusive |
| `end_date` | date not null | inclusive |
| `reason` | varchar(500) null | |
| `created_at` | datetime not null default CURRENT_TIMESTAMP | |

FK columns are `VARCHAR(255)` and the table is `COLLATE=utf8mb4_general_ci` to
match `clubs.id` / `user.id` (avoids MySQL error 3780). Indexes:
`(club_id, user_id)` for the "my absences" list and `(club_id, start_date,
end_date)` for the overlap probe.

## Endpoints

All under `v1/clubs`, member-authenticated:

| method | path | who | purpose |
|---|---|---|---|
| GET | `/{clubId}/absences` | any member | caller's own absences |
| POST | `/{clubId}/absences` | any member | create own absence |
| DELETE | `/{clubId}/absences/{absenceId}` | owner | delete own absence |
| GET | `/{clubId}/absences/overview` | LEITER/CO_LEITER | all members' absences (with display names) |
| GET | `/{clubId}/events/{eventId}/availability` | any member | inferred expected attendance |

`overview` is registered before the `/{absenceId}` param route so the static
segment wins. DELETE is scoped `WHERE id = ? AND club_id = ? AND user_id = ?`
so a member can only ever remove their own row; 0 rows affected → "not found".

## Semantics

**Availability** (`ClubAbsenceService.Availability`): load the event, all club
members, the event's RSVP rows, and the user ids whose absence range covers the
event's `start_date`. Per member:
- explicit RSVP present → `source: "rsvp"`, available iff `YES`/`MAYBE`;
- else overlapping absence → `source: "absence"`, unavailable;
- else → `source: "assumed"`, available.

`expectedCount` = members counted available; `totalCount` = all members.

Overlap is computed in SQL as `start_date <= eventDate AND end_date >=
eventDate` (a single-day probe against the event's start), keeping the query
trivial; DATE-vs-DATETIME comparison is fine in MySQL.

## Permissions

- Own CRUD requires club membership (`GetRoleInClub`).
- Overview requires `canManage` (LEITER / CO_LEITER), else `ErrManageForbidden`
  → 403.
- Availability requires membership only (aggregate, like the attendance matrix).

## UI

`components/club/ClubAbsenceSection.tsx`, reached via the new
`abwesenheiten` entry in `CLUB_SECTIONS`. Uses the `http` shim + React Query
(mirrors `ClubPinboardSection`): a create card (two date inputs + reason), the
caller's list with per-row delete confirmation, and — for leaders
(`can_manage_roles`) — a read-only overview card. Strings live under the
`absence.*` i18n keys in `de.json` / `en.json`.

## Tests

- **Go integration** (`api_go/tests/club_absence_test.go`): create/list/delete
  round-trip; inverted range rejected (400); availability infers unavailable
  from an absence and an explicit RSVP overriding it; overview is 403 for a
  demoted MITGLIED while their own list stays 200.
- **Playwright** (`ui/e2e/club-absence.spec.ts`): a member creates an absence
  (mocked backend, list refetch returns the row) and deletes it, asserting the
  row appears then disappears.
