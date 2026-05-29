# Club Settings Edit — Design

**Date:** 2026-05-29
**Status:** Approved (pending spec review)

## Goal

Let a club leader edit a club's settings **after** creation. Today those settings
(`members_can_send_messages`, `dates_visible_for_all_members`,
`feedback_visibility`, `reason_visibility`, plus name/type/address) can only be
set in the create wizard and default `members_can_send_messages` to `false` — so
messaging is effectively unusable with no way to turn it on. There is no
update endpoint and no settings UI.

This spec adds an edit path (backend + UI) and, as part of the same change,
**fixes a latent visibility bug** where the club-events attendance gating does
not understand the visibility tokens the app actually stores.

## Scope

**In scope** (mirrors Konzertmeister's editable association settings, grounded in
the fields the create wizard already collects):
- Editable after creation: `name`, `club_type`, address (`street`,
  `house_number`, `location`, `postal_code`, `country`),
  `dates_visible_for_all_members`, `members_can_send_messages`,
  `feedback_visibility`, `reason_visibility`.
- A pre-filled settings form reachable two ways (a club-detail section **and** a
  gear shortcut).
- Fix `clubEventService.visibilityAllows()` to understand the real visibility
  tokens.

**Out of scope:**
- `confirmed_representative` — a one-time legal confirmation at creation; not
  re-editable here.
- Club logo (not modeled).
- Member/role/section management (already exists separately / future).
- Refactoring the create wizard (`ClubView.tsx`) beyond extracting the shared
  visibility-option constant.

## Chosen approach: A — dedicated UPDATE

`UPDATE clubs … WHERE id = ?` (+ `UPDATE address …`). **Not** the existing
`SaveClub` (`REPLACE INTO clubs`), which deletes+reinserts the row and would
cascade-delete members and events via `ON DELETE CASCADE`. Rejected: REPLACE
reuse (data loss), generic reflection-based PATCH (overkill).

## Backend

### Queries (append to `data/sql/queries/query.sql`, sqlc-generated)
```sql
-- name: UpdateClub :exec
UPDATE clubs
SET name = ?, club_type = ?, dates_visible_for_all_members = ?,
    members_can_send_messages = ?, feedback_visibility = ?, reason_visibility = ?
WHERE id = ?;

-- name: UpdateAddress :exec
UPDATE address
SET street = ?, house_number = ?, location = ?, postal_code = ?, country = ?
WHERE id = ?;
```
Note: `UpdateClub` does not touch `address_id` or `confirmed_representative`.

### DTO (`controllers/dto/`)
`ClubSettingsPatchDto` — same snake_case fields as `ClubPostDto` minus
`confirmed_representative`: `name`, `club_type`, `street`, `house_number`,
`location`, `postal_code`, `country`, `dates_visible_for_all_members`,
`members_can_send_messages`, `feedback_visibility`, `reason_visibility`.

### Service
`ClubService.UpdateClub(clubId string, in dto.ClubSettingsPatchDto) (*models.Club, error)`:
1. Load the club (for its `address_id`) via `FindClubByID`.
2. `UpdateAddress` (using the club's `address_id`), then `UpdateClub`.
3. Return the updated `models.Club` (re-read or constructed) for mapping to `ClubDto`.

The **permission check stays in the controller** (consistent with existing
controllers like `PatchClubMemberRole` / `handleInviteForEmails`, which resolve
the role via `ClubMemberService` and 403 before calling the service). This keeps
`ClubService` free of a new `ClubMemberService` dependency — the service assumes
the caller is already authorized.

### Controller + route
`PATCH /v1/clubs/{clubId}` → `controllers.UpdateClub`:
- bind `ClubSettingsPatchDto`; resolve requester role via `ClubMemberService`;
  if not Admin/CoAdmin → 403; else call service; return updated `ClubDto`.
- Register in the `v1/clubs` route group.

### Visibility-token fix (same change)
The create form and DB use these tokens (see `ClubView.tsx` `visibilityOptions`):
`all-members`, `leaders-and-authorized`, `only-authorized`. The club-events
`visibilityAllows()` currently switches on `all`/`managers`/`self`/`section`, so
real clubs fall into the `default → true` branch (everyone sees everything),
which is wrong for restricted clubs.

Update `visibilityAllows(token, isManager)` to:
| token | result |
|---|---|
| `all-members` | `true` (everyone) |
| `all` | `true` (legacy alias used by the club-events test helper `createClubForTest`) |
| `leaders-and-authorized` | `isManager` |
| `only-authorized` | `isManager` (stricter; identical until sections/registers land — `// TODO: sections`) |
| `""` (legacy/empty) | `true` |
| default (unknown) | `isManager` (fail safe — restrict rather than leak) |

Note the changed default: unknown/empty tokens should **fail safe** toward
restriction for non-empty unknown values, but empty string stays permissive for
backward compatibility with any pre-existing rows. (Empty handled explicitly.)

## Frontend

### Shared module
`ui/src/models/clubSettings.ts` exports the `visibilityOptions` tuple (and its
type) so the create wizard (`ClubView.tsx`) and the edit form share one source.
`ClubView.tsx` is updated to import it instead of its local literal (the only
change to the wizard).

### Edit form
`ui/src/components/club/ClubSettingsForm.tsx` — single-step form, `react-hook-form`
+ zod (same field set as the wizard minus `confirmed_representative`), **pre-filled
from the current club**. Submit → `$api.useMutation("patch", "/v1/clubs/{clubId}")`
→ on success invalidate `["clubs"]` and the club-detail query so the UI (e.g. the
"Nachrichten öffnen" button) updates immediately. Renders only for managers.

### Navigation (both)
- New `CLUB_SECTIONS` entry `"einstellungen"` (gear icon) in `ClubDetailView.tsx`,
  rendered only when the caller is a manager; excluded from the fallback card.
- A gear button in the club header that sets the active section to
  `"einstellungen"` (no new route).

### Permission
Gate on the existing `can_manage_roles` capability (Admin/CoAdmin) from the
permissions DTO — no new capability. Backend enforces independently (403).

## Testing

- **Go integration** (`tests/`, testcontainers/HTTP): manager `PATCH`es settings
  → 200 and values changed; setting `members_can_send_messages=true` then makes
  the messaging endpoint succeed where it failed before; **members and events
  still exist after the update** (proves UPDATE, not REPLACE cascade).
- **Go unit:** `visibilityAllows()` for `all-members` (true for all), and
  `leaders-and-authorized` / `only-authorized` (true only for managers).
- **Frontend:** `tsc --noEmit` + `npm run build` clean.

## Risks / notes
- The cascade-delete trap is the main risk; the UPDATE-not-REPLACE choice plus
  the "members/events survive" test directly guard it.
- Visibility-token unification touches the already-merged-or-in-PR club-events
  feature; the unit test pins the new mapping.
- `ClubDto` must expose the settings fields the form pre-fills from; verify the
  existing `ClubDto`/mapper already include `feedback_visibility` etc., and add
  them if missing (the create flow returns them, so they are likely present).
