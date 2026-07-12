# Club Sections (Register) + Section-Targeted Events — Design

**Date:** 2026-07-12
**Status:** Implemented (2026-07-12; migration `00029_club_sections.sql`)

## Goal

Deliver the feature the native-club-events spec reserved as "the planned next
feature": **instrument sections** (Register: Flöten, Klarinetten, …) per club,
**section leaders** (Registerführer), **section-targeted events** (Registerprobe),
and activation of the reserved `SECTION_MANAGERS` / `"section"` attendance
visibility.

## Scope

**In scope:**
- Section CRUD per club (managers only), unique names per club.
- Member assignment: one section per member (nullable) + a `section_leader`
  flag on the membership (a member leads their own section).
- Section-targeted events: `club_events.section_fk` (nullable = whole club).
  Targeted events are listed only for members of that section (and club
  managers); RSVP is limited to the target audience; attendance counts and
  the matrix cover section members only; create/cancel notifications go to
  section members and managers instead of everyone.
- `"section"` visibility token becomes real: club managers see all rows;
  **section leaders see the rows of their own section**; everyone else sees
  only their own row (aggregate counts stay visible). Reasons follow the same
  rule via the independent reason-visibility setting.
- UI: section management card + per-member section select and Registerführer
  checkbox in the club detail page; optional section picker in the event
  form; section badge on event cards; `"section"` option in the visibility
  selects.

**Out of scope (future):**
- Multiple sections per member; sub-sections.
- Section-scoped chats/pinboard/files.
- Substitutes / cross-section borrowing per event.

## Data model

Migration `00029_club_sections.sql`:

### `club_section`
| column | type | notes |
|---|---|---|
| `id` | varchar(36) PK | UUID |
| `club_id` | varchar(255) FK → clubs, cascade | |
| `name` | varchar(255) not null | UNIQUE per club |

### Alterations
- `club_participant` + `section_fk varchar(36) NULL` (FK → club_section,
  **ON DELETE SET NULL** — deleting a section unassigns, never removes members)
  and `section_leader bool NOT NULL DEFAULT FALSE`.
- `club_events` + `section_fk varchar(36) NULL` (FK → club_section, ON DELETE
  SET NULL — a deleted section turns its events into whole-club events).

## Semantics

- **Listing:** non-managers see untargeted events plus events of their own
  section; managers see everything. Applied in SQL via the caller's
  participant row (`section_fk IS NULL OR section_fk = me.section_fk OR
  me.role IN ('LEITER','CO_LEITER')`), in all three list queries (per club,
  cross-club, ICS feed).
- **Counts:** `member_count` (and therefore `undecidedCount`) counts only the
  target audience for section events.
- **RSVP:** responding to a section event requires membership in that section
  (managers included only if they are in the section — a Leiter who doesn't
  play in the register is not expected to RSVP).
- **Attendance:** the matrix contains only the target audience. The
  `"section"` visibility token means: managers all rows; section leaders the
  rows of members sharing their section; others own row only.
- **Notifications:** create/cancel of a section event publishes to section
  members and managers; response notifications to managers stay as-is.

## API

| method | path | who | purpose |
|---|---|---|---|
| `GET` | `/v1/clubs/{clubId}/sections` | members | list sections + member counts |
| `POST` | `/v1/clubs/{clubId}/sections` | managers | create `{name}` |
| `PUT` | `/v1/clubs/{clubId}/sections/{sectionId}` | managers | rename |
| `DELETE` | `/v1/clubs/{clubId}/sections/{sectionId}` | managers | delete (members/events fall back to NULL) |
| `PATCH` | `/v1/clubs/{clubId}/members/{memberUserId}/section` | managers | `{sectionId?, sectionLeader}` |

`ClubEventUpsertDto` gains optional `sectionId`; `ClubEventDto` gains
`sectionId`/`sectionName`; `ClubMemberDto` gains `sectionId`/`sectionName`/
`sectionLeader`.

## Testing

- Unit: section-token row filtering (leader sees own section, not others).
- Integration: CRUD + 403 for non-managers; unique name conflict; member
  assignment; targeted event hidden from other sections but visible to
  managers; RSVP 403/400 outside the audience; attendance scoped to the
  section; leader row visibility under `"section"`; section delete falls
  back to whole-club events and unassigned members.
