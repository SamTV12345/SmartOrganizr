# Club Polls / Surveys (Umfragen) — Design

Date: 2026-07-23

## Problem

A club leader wants to ask the membership a question ("Which date for the summer
concert?", "Do we buy new uniforms?") and collect answers. Members vote and
everyone sees the running results. Standalone feature, mirrors the shape of club
events (parent row + child options + per-user child responses).

## Schema (migration `00033_club_poll.sql`)

- `club_poll` — `id VARCHAR(36)` PK, `club_id VARCHAR(255)` FK→`clubs.id` (CASCADE),
  `question`, `created_by_user_id VARCHAR(255)`, `multiple_choice TINYINT(1)`,
  `closed TINYINT(1)`, `closes_at DATETIME NULL`, `created_at`.
- `club_poll_option` — `id VARCHAR(36)` PK, `poll_id VARCHAR(36)` FK→`club_poll.id`
  (CASCADE), `label`, `position INT`.
- `club_poll_vote` — `poll_id`, `option_id`, `user_id VARCHAR(255)`, `created_at`.
  PK `(poll_id, option_id, user_id)` → one vote per (poll, option, user). FKs to
  `club_poll` and `club_poll_option`, both CASCADE.

All tables `COLLATE=utf8mb4_general_ci` (FK-collation rule, MySQL Error 3780).

## Permissions

- Create / close / delete a poll: manager only (`LEITER`/`CO_LEITER`), enforced in
  the service via `ClubMemberService.GetRoleInClub` + `canManage` — same gate as
  club events (`requireManager`).
- Any club member may vote and view results (`requireMember`).
- Single-choice enforcement lives in the service: a vote replaces the caller's
  previous votes for that poll (delete-then-insert), so single-choice always keeps
  at most one row; multiple-choice keeps one row per selected option.

## Endpoints (under `/v1/clubs/{clubId}`)

| Method | Path                          | Who     | Purpose |
|--------|-------------------------------|---------|---------|
| GET    | `/polls`                      | member  | list polls w/ options, counts, my votes |
| POST   | `/polls`                      | manager | create poll (question + options) |
| POST   | `/polls/{pollId}/vote`        | member  | cast/replace vote (`optionIds`) |
| POST   | `/polls/{pollId}/close`       | manager | close a poll |
| DELETE | `/polls/{pollId}`             | manager | delete a poll (cascades options+votes) |

Results = per-option `voteCount` + `votedByMe`, plus poll `totalVotes`.

## UI

New `CLUB_SECTIONS` tab `umfragen` ("Umfragen", `Vote` icon) in `ClubDetailView`,
rendering `ClubPollsSection`. Managers get a create form (question + dynamic option
inputs, multiple-choice checkbox). Every poll card shows options as radio
(single) or checkbox (multiple), a "Abstimmen" button, and results as a CSS bar
(width = percentage) with counts — no charting dependency. Managers can close/delete.

## Tests

- Go integration (`tests/club_polls_test.go`): create poll → vote → re-vote
  (single-choice replace collapses to one row) → assert counts; multiple-choice
  keeps multiple; non-manager create/close/delete → 403.
- Playwright (`e2e/club-polls.spec.ts`): mock list/create/vote, create a poll,
  cast a vote, assert results bar updates.
