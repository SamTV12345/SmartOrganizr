# Club Attendance Statistics (Anwesenheitsstatistik) — Design

**Date:** 2026-07-23
**Status:** Implemented (2026-07-23; read-only, no migration)

## Goal

Show **per-member and per-section attendance rates over time** for a club, from
the RSVP data already collected in `club_event_response`. This turns the
existing yes/no/maybe responses into an at-a-glance picture of who shows up.

## Scope

**In scope:**
- Per-member attendance rate for a club (all-time + a recent window).
- Per-section aggregate rates (folded from the member rows in Go).
- One read endpoint, one new tab ("Statistik") in the club detail page.

**Out of scope:** trends/time-series charts, CSV export, per-event drill-down,
excused-vs-unexcused weighting. This is read-only: **no new table, no migration.**

## Attendance definition

- **Attended** = the member's `club_event_response.status = 'YES'`. The RSVP
  enum is `YES | NO | MAYBE` (see `service.normalizeStatus`); only `YES` counts
  as present. `NO`, `MAYBE` and *no response at all* count as not-attended.
- **Eligible events** for a member = the club's events that are
  `cancelled = 0` **and** `start_date < NOW()` (past only) **and** are either
  whole-club (`section_fk IS NULL`) or target the member's own section
  (`section_fk = club_participant.section_fk`). This mirrors the RSVP audience
  rule — a member could not attend another section's rehearsal, so it does not
  count against them.
- **Rate** = attended / eligible, as a `0..1` fraction. Zero eligible events →
  rate `0`. Computed all-time and over a **recent window** (default 90 days,
  `?windowDays=`), where the window bound is `start_date >= now-windowDays`.
- **Section rate** = the member-event pairs summed across the section's members
  (Σ attended / Σ eligible): an average attendance for the register. Members
  with no section aggregate into a "Ohne Register" bucket.

## Queries

One sqlc query, `MemberAttendanceStats` (appended to `query.sql` under
`-- ==== attendance stats ====`). It returns one row per club member with
`user_id`, name fields, `section_fk`/section name, and four correlated
`COUNT(*)` subqueries: eligible/attended totals and eligible/attended within the
window.

- **Correlated `COUNT(*)` subqueries** (not `COALESCE(SUM(CASE …))`) are used on
  purpose: `COUNT(*)` types cleanly as `int64` under MySQL/sqlc, whereas
  `COALESCE(SUM(...))` types poorly, and this matches the existing
  `yes_count`/`no_count` pattern in `ListClubEventsForClub`.
- **NULL safety:** the participant table is the driving table
  (`LEFT JOIN club_section` for the name), so members with **zero responses**
  and members with **no section** still appear (0 counts, NULL section →
  `sql.NullString`). No `sqlc.embed` of the optional section (avoids the
  NULL-scan crash).
- **Section aggregates are folded in Go** (`ClubStatsService.Attendance`) from
  the member rows rather than a second GROUP BY query — the per-member
  conditional counting is already done in SQL, and folding in Go gives the
  "no section" bucket and zero-response members for free. `// ponytail:` one
  query; add a dedicated section query only if member lists get huge.

## Endpoint

`GET /v1/clubs/{clubId}/stats/attendance?windowDays=90`
→ `dto.AttendanceStatsDto { windowDays, members[], sections[] }`.

Rates are fractions; the UI formats them as percentages.

## Permissions

**Any club member may read** the stats — mirrors `ClubSectionService.List`
(membership required, no role gate). The feature writes nothing, so there is
nothing further to gate. Managers and plain members see the same club-wide
numbers. Handler returns `403` (`ErrNoClubAccess`) for non-members and logs
server-side via `fiber/v3/log` on unexpected errors (raw errors JSON-encode to
`{}`). Tightening to leaders-only is a one-line role check if ever wanted.

## UI

New `statistik` tab (German label "Statistik", `BarChart3` icon) in
`ClubDetailView`, rendering `components/club/ClubStatsSection.tsx`:
- Section card: one accessible CSS bar per section (width = rate), label
  `attended/eligible`, "Ohne Register" for the no-section bucket.
- Member table: name, register, all-time bar, window bar.

No charting dependency (plain CSS bars). Data is fetched with the `http` shim
(`GET .../stats/attendance`); types are declared locally because the
OpenAPI→TS emit is currently broken by the repo's `typescript@7.0.2` preview
pin (see Known gaps).

## Tests

- **Go integration** (`tests/club_stats_test.go`): seeds a club, a Flöten
  section, members (one sectioned, one not), past whole-club + section events
  plus a cancelled and a future event (must be ignored), and responses; asserts
  the computed member rates and section aggregates. Edge cases covered: a
  member with **zero responses = 0%**, and members with **no section** still
  aggregating into the "" bucket. Plus a membership 403/200 test.
- **Playwright** (`e2e/club-stats.spec.ts`): mocks the clubs list and the stats
  endpoint via the shared fixture, navigates to `?section=statistik`, asserts
  the section and member rates render.

## Known gaps

- `ui/src/api/schema.ts` was **not** regenerated: `openapi-typescript` crashes
  against the repo's pinned `typescript@7.0.2` native preview (no `ts.factory`).
  `api_go/docs/openapi.json` (the contract) *is* regenerated. The feature uses
  the `http` shim, so it needs no generated types.
- The Go tests require Docker/testcontainers to run; they compile
  (`go vet ./...`) but were not executed in this environment.
