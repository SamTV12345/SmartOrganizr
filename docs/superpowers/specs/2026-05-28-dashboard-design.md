# Feature D — Dashboard Design

Date: 2026-05-28
Status: Approved (design), pending spec review

## Purpose

Replace the empty post-login landing with a real dashboard at `/dashboard` aggregating
the user's most relevant info: upcoming events, unread messages, their clubs, and
recent pinn wall posts. The sidebar already links to `/dashboard` but no route exists.

## Dependencies

This feature is **glue over existing + new contracts**. It consumes:
- Existing: `GET /v1/events/{userId}` (upcoming events), `GET /v1/clubs/{userId}`
  (my clubs).
- Feature A contract: `GET /v1/users/{userId}/pinboard/recent` (recent posts).
- Feature C contract: `GET /v1/notifications/unread-summary` (unread totals).

Built in parallel against the agreed contracts. Each card fetches independently and
**degrades gracefully**: if a not-yet-merged endpoint 404s, that card shows an empty
state rather than erroring the page. Final integration happens after A + C merge to
master and types are regenerated.

## Scope (YAGNI)

In scope: four cards on a responsive grid, each linking to its full feature; loading
and empty states; make `/dashboard` the default landing.

Out of scope: customizable/draggable widgets, charts/analytics, per-user layout prefs.

## Architecture

No backend changes (pure consumer). New `pages/DashboardView.tsx` + one component per
card under `components/dashboard/`:
- `UpcomingEventsCard.tsx` — next N events from `/v1/events/{userId}` (query
  `since=now`), date-formatted, link to `/myDates`.
- `UnreadMessagesCard.tsx` — `total` + per-club breakdown from `unread-summary`, link
  to `/myMessages`. Hidden count badge when 0.
- `MyClubsCard.tsx` — cards/list from `/v1/clubs/{userId}` with club name/type, link to
  each `/clubs/{clubId}`.
- `RecentPinboardCard.tsx` — newest posts from `.../pinboard/recent`, each showing
  title, clubName, author, relative date; link to the originating club.

All use `$api.useQuery(...)` with the generated types. Each card is self-contained
(own query, own loading/empty/error boundary) so DashboardView stays a thin layout.

## Routing changes (`App.tsx`)

- Add `<Route path="/dashboard" element={<DashboardView/>}/>` inside the authenticated
  layout (lazy-load consistent with other pages).
- Change the `/` redirect from `/welcome` to `/dashboard`.
- Keep `/welcome` route available (marketing/empty-state), but the default authed
  landing is the dashboard.
- Sidebar `/dashboard` entry already exists — verify it's active/highlighted.

## Frontend Tests / Verification

No backend tests (no backend change). Manual verification via `npm run dev`:
- dashboard loads with all four cards
- each card links correctly
- cards with no data show empty states
- graceful behavior when A/C endpoints are absent (pre-integration)

## i18n keys (`de.json` + `en.json`)

`dashboard.title`, `dashboard.events`, `dashboard.events.empty`,
`dashboard.messages`, `dashboard.messages.empty`, `dashboard.clubs`,
`dashboard.clubs.empty`, `dashboard.pinboard`, `dashboard.pinboard.empty`,
`dashboard.viewAll`.

## Integration / Merge

Merge LAST (after A + C). Conflicts: `App.tsx` routing (small), `schema.ts` (regen on
master). Once merged, confirm the recent-pinboard and unread cards light up with real
data end-to-end.
