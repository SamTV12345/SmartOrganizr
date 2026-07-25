# Paket 3: Dashboard und Termine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die nativen Vereinstermine erreichen das Dashboard, unbeantwortete Zusagen werden sichtbar und beantwortbar, die Anwesenheitsmatrix hört auf pro Terminkarte eine eigene Query zu feuern, vergangene Termine sind erreichbar, eine Absage ist rückgängig machbar — und Registerleiter dürfen die Termine ihres eigenen Registers verwalten.

**Architecture:** Serverseitig zwei Ergänzungen: ein Autoritätsobjekt (`eventAuthority`) ersetzt das pauschale `requireManager` in Create/Update/Cancel/Delete, sodass Registerleiter ihr Register verwalten können; dazu `reinstate` als Gegenstück zu `cancel`. Das Permissions-DTO transportiert die neue Autorität ins UI. Clientseitig führt das Dashboard beide Terminquellen zusammen, bekommt eine Karte für offene Zusagen, und der `ClubEventsManager` lädt die Matrix erst auf Klick, kennt einen Vergangenheitsmodus und macht die Serien-Semantik sichtbar.

**Tech Stack:** Go 1.26 + Fiber v3 + sqlc, MySQL; React 19 + TanStack Query + vitest.

## Global Constraints

- **Keine Migration.** `club_events.series_id`, `club_participant.section_fk` und `.section_leader` existieren (Stand 00030).
- SQL nur in `api_go/data/sql/queries/query.sql`, danach `cd api_go && sqlc generate`.
- Nach Endpunkt-/DTO-Änderungen: `cd api_go && go run github.com/swaggo/swag/cmd/swag@v1.16.6 init --parseDependency --parseInternal -o docs`, dann das TS-Schema. **Achtung:** `pnpm gen:api` ist durch den TypeScript-7-Bump kaputt; der zweite Schritt läuft über `cd ui && pnpm dlx --package typescript@5.9.3 --package openapi-typescript@7.13.0 --shell-mode "openapi-typescript ../api_go/docs/openapi.json -o src/api/schema.ts"` (siehe Paket 2). `swagger2openapi` selbst funktioniert und läuft über `npx swagger2openapi ../api_go/docs/swagger.json -o ../api_go/docs/openapi.json`.
- Testumgebung für Go: `container system start`, `socktainer &`, `DOCKER_HOST=unix://$HOME/.socktainer/container.sock`, `TESTCONTAINERS_RYUK_DISABLED=true` (siehe `docs/apple-container-testing.md`).
- Neue Strings in `dashboard.*` bzw. `clubEvents.*`, immer in `de.json` **und** `en.json`.
- Bestehende Sichtbarkeitslogik (`rowVisible`, Token `"section"`) **nicht** anfassen — das Leserecht der Registerleiter funktioniert bereits.

## Abweichung von der Spec, bewusst

Die Spec wollte im Serien-Badge die **Frequenz** anzeigen. Die ist nicht persistiert: Migration 00030 speichert nur `series_id`, die Occurrences sind eigenständige Zeilen. Die Frequenz aus den Abständen zurückzurechnen wäre falsch, sobald eine Occurrence verschoben wurde. Stattdessen zeigt das Badge die **Anzahl der Termine der Serie** (serverseitig gezählt) — dieselbe Orientierung, ohne Erfindung.

`DeleteSeries` bleibt **managerpflichtig**. Eine ganze Serie zu löschen ist ein größerer Hammer als eine Occurrence, und die Occurrences einer Serie können nach individuellen Edits auf verschiedene Register zeigen; die Rechteprüfung müsste dann jede einzelne prüfen. Bis dahin: nur Leitung.

---

### Task 1: Registerleiter dürfen ihre Register-Termine verwalten (Server)

**Files:**
- Modify: `api_go/service/clubEventService.go`, `api_go/controllers/dto/ClubPermissionsDto.go`, `api_go/controllers/clubs.go`
- Test: `api_go/tests/club_events_test.go`

**Interfaces:**
- Produces:
  - `type eventAuthority struct { role models.ClubRole; sectionID string; isSectionLead bool }`
  - `(*ClubEventService).authority(clubID, userID string) (eventAuthority, error)`
  - `(eventAuthority).mayManage(section sql.NullString) bool` — Manager immer; Registerleiter nur für Termine des eigenen Registers, nie für vereinsweite.
  - `ClubPermissionsDto.CanManageSectionEvents bool` (`can_manage_section_events`) und `.MySectionID string` (`my_section_id`).

- [ ] **Step 1: Write the failing tests**

In `api_go/tests/club_events_test.go`, mit einem Registerleiter (über `testQueries` bzw. die Section-Endpunkte gesetzt):
1. Registerleiter erstellt einen Termin für **sein** Register → 200.
2. Registerleiter erstellt einen vereinsweiten Termin (`sectionId` leer) → 403.
3. Registerleiter erstellt einen Termin für ein **fremdes** Register → 403.
4. Registerleiter verschiebt einen eigenen Register-Termin auf ein fremdes Register → 403 (alte *und* neue Sektion müssen die eigene sein).
5. Registerleiter sagt einen eigenen Register-Termin ab → 200; einen vereinsweiten → 403.
6. Mitglied ohne Leiterflag im selben Register → 403 für alles.
7. `GET /v1/clubs/{id}/me/permissions` liefert für den Registerleiter `can_manage_section_events: true` und `my_section_id` gleich seiner Sektion; für ein normales Mitglied `false` und `""`.

- [ ] **Step 2: Run and watch them fail**

Run: `cd api_go && go test ./tests/ -run TestClubEventSectionLeader -v`
Expected: FAIL — Registerleiter bekommt heute 403 für alles.

- [ ] **Step 3: Implement the authority object**

`authority` liest `s.members.GetParticipant` (eine Query, liefert Rolle, `SectionFk`, `SectionLeader`). `mayManage` wie oben. Danach in `Create`, `Update`, `Cancel`, `Delete` das `requireManager` ersetzen:

- `Create`: nach `resolveSection` prüfen, dann `mayManage(sectionFk)`.
- `Update`: Event zuerst über `GetClubEventByID` laden und **beide** Sektionen prüfen (`ev.SectionFk` und die neue `sectionFk`), sonst könnte ein Registerleiter einen Termin aus seinem Register herausschieben oder einen vereinsweiten an sich ziehen.
- `Cancel`, `Delete`: gegen `ev.SectionFk` prüfen.
- `DeleteSeries`: unverändert `requireManager` (siehe Abweichung oben).

Fehlerfall bleibt `ErrManageForbidden` → 403 wie bisher.

- [ ] **Step 4: Extend the permissions DTO**

`buildPermissionsDto` bekommt die Sektionsdaten (Signatur auf `(role models.ClubRole, sectionID string, sectionLeader bool)` erweitern), `GetMyClubPermissions` nutzt `GetParticipant` statt `GetRoleInClub`. `CanManageSectionEvents` ist `sectionLeader && sectionID != ""`.

- [ ] **Step 5: Green, regenerate docs, commit**

---

### Task 2: Absage rückgängig machen (Server)

**Files:**
- Modify: `api_go/data/sql/queries/query.sql`, `api_go/service/clubEventService.go`, `api_go/controllers/clubEvents.go`, `api_go/routers/setupRouter.go`
- Test: `api_go/tests/club_events_test.go`

**Interfaces:**
- Produces: Query `ReinstateClubEvent`, `(*ClubEventService).Reinstate(clubID, userID, eventID string) error`, Route `POST /v1/clubs/:clubId/events/:eventId/reinstate`.

- [ ] **Step 1: Write the failing test**

Termin anlegen, absagen, `reinstate` → 200 und `cancelled: false` in der Liste; danach nimmt der Termin wieder Rückmeldungen an (der Server lehnt Antworten auf abgesagte Termine ab, das ist der beobachtbare Beweis). Ein Registerleiter darf sein Register reinstaten, ein normales Mitglied nicht (403).

- [ ] **Step 2: Run and watch it fail** — Route fehlt, 405.

- [ ] **Step 3: Implement**

```sql
-- name: ReinstateClubEvent :exec
UPDATE club_events SET cancelled = 0, updated_at = CURRENT_TIMESTAMP
WHERE id = ? AND club_id = ?;
```

`Reinstate` spiegelt `Cancel`: Autorität prüfen, Event laden, Query, dann `notifyMembers` mit `NotifClubEventCreated` — die Betroffenen sollen erfahren, dass der Termin wieder steht (ein eigener Benachrichtigungstyp wäre schöner, aber der Client kennt heute nur die bestehenden; das ist ein bewusster kleiner Kompromiss und im Code vermerkt).

- [ ] **Step 4: Green, regenerate docs, commit**

---

### Task 3: Serienlänge im DTO (Server)

**Files:**
- Modify: `api_go/data/sql/queries/query.sql`, `api_go/service/clubEventService.go`, `api_go/controllers/dto/ClubEventDto.go`
- Test: `api_go/tests/club_events_test.go`

**Interfaces:**
- Produces: `ClubEventDto.SeriesCount int` (`seriesCount,omitempty`) — Anzahl der Occurrences der Serie; 0 für Einzeltermine.

- [ ] **Step 1: Write the failing test**

Serie mit `WEEKLY` über drei Wochen anlegen; jede Occurrence meldet `seriesCount` gleich der Anzahl angelegter Termine. Ein Einzeltermin meldet 0.

- [ ] **Step 2: Run and watch it fail**

- [ ] **Step 3: Implement**

```sql
-- name: CountClubEventsPerSeries :many
SELECT series_id, COUNT(*) AS occurrences
FROM club_events
WHERE club_id = ? AND series_id IS NOT NULL
GROUP BY series_id;
```

In `ListForClub`/`ListForUser` einmal laden und den Zähler auf die DTOs verteilen. Nicht pro Event zählen — das wäre das N+1, das dieses Paket gerade abschafft.

- [ ] **Step 4: Green, regenerate docs, commit**

---

### Task 4: Dashboard führt beide Terminquellen zusammen (UI)

**Files:**
- Create: `ui/src/utils/UpcomingEvents.ts`, `ui/src/utils/UpcomingEvents.test.ts`
- Modify: `ui/src/pages/DashboardView.tsx`, `ui/src/language/json/*.json`

**Interfaces:**
- Produces: `mergeUpcoming(feed: EventModel[], club: ClubEventModel[], limit: number): UpcomingItem[]` mit `type UpcomingItem = { id: string; summary: string; startDate?: string; location?: string; origin: "feed" | "club"; clubName?: string }` — nach Startdatum aufsteigend, auf `limit` gekürzt, Einträge ohne Startdatum ans Ende.

`UpcomingEventsCard` fragt heute nur `/v1/events/{userId}` ab, den iCal-Spiegel. Die nativen Vereinstermine (`/v1/club-events`) fehlen vollständig — das Feature, an dem am längsten gebaut wurde, ist auf dem Dashboard unsichtbar.

- [ ] **Step 1: Write the failing test for the pure merge**

`UpcomingEvents.test.ts`: gemischte Eingaben werden nach Datum sortiert; das Limit greift; `origin` bleibt erhalten; Einträge ohne `startDate` landen hinten; leere Eingaben ergeben `[]`.

- [ ] **Step 2: Run and watch it fail**, dann implementieren.

- [ ] **Step 3: Wire the card**

Beide Queries laden (`$api.useQuery` für `/v1/events/{userId}` bleibt, `/v1/club-events` kommt dazu), `mergeUpcoming` anwenden, pro Zeile ein Herkunfts-Badge (`dashboard.originFeed` / `dashboard.originClub` mit Vereinsnamen).

- [ ] **Step 4: Green + commit**

---

### Task 5: Karte „Zusage ausstehend" (UI)

**Files:**
- Modify: `ui/src/pages/DashboardView.tsx`, `ui/src/language/json/*.json`

**Interfaces:**
- Consumes: `/v1/club-events` (`myStatus === ""` heißt unentschieden), `ClubEventResponseControls`.

Beides existiert; es fehlt nur die Zusammenführung. Keine API-Änderung.

- [ ] **Step 1: Add the card**

Neue Karte listet die nächsten fünf Club-Termine mit `myStatus === ""` (abgesagte ausgenommen), jeweils mit Vereinsname, Datum und den vorhandenen Antwort-Buttons. Leerzustand: „Alles beantwortet."

- [ ] **Step 2: Verify and commit**

Run: `cd ui && pnpm test && npx tsc --noEmit`

---

### Task 6: Terminliste — N+1, Vergangenheit, Serien-Hinweis, Reinstate (UI)

**Files:**
- Modify: `ui/src/components/club/ClubEventsManager.tsx`, `ui/src/models/ClubEvent.ts`, `ui/src/language/json/*.json`

- [ ] **Step 1: Attendance on demand**

`AttendanceMatrix` bekommt ein `enabled`-Flag und wird erst nach Klick auf „Rückmeldungen anzeigen" geladen (`useState` pro Karte). Heute feuert jede Karte beim Rendern eine eigene Query — bei 20 Terminen 20 Requests, die für Nicht-Leitung meist leer zurückkommen.

- [ ] **Step 2: Past events**

Umschalter „Vergangene Termine": `since` wird auf sechs Monate zurück gesetzt, die Liste absteigend sortiert. Der Endpunkt akzeptiert `since` bereits; nur der fixe „jetzt"-Wert verschwindet.

- [ ] **Step 3: Series semantics**

Beim Bearbeiten eines Termins mit `seriesId` eine Hinweiszeile „gilt nur für diesen Termin" (`clubEvents.seriesEditHint`); das Badge zeigt `clubEvents.seriesCount` mit `seriesCount`.

- [ ] **Step 4: Reinstate**

Bei `cancelled` einen Knopf „Absage aufheben", der `POST .../reinstate` aufruft und dieselben Queries invalidiert wie `cancel`.

- [ ] **Step 5: Section leaders see the form**

`ClubEventsManager` erhält zusätzlich `canManageSectionEvents` und `mySectionId` (aus `ClubPermissions`); ist nur das gesetzt, wird das Formular gezeigt, der Register-Select aber fest auf das eigene Register genagelt (kein „ganzer Verein"). In `ClubDetailView` entsprechend durchreichen.

- [ ] **Step 6: Full verification and commit**

Run: `cd ui && pnpm test && npx tsc --noEmit && pnpm build`, dazu `cd api_go && go test ./...`

---

### Task 7: Abschluss

- [ ] **Step 1:** Docs und TS-Schema regenerieren (siehe Global Constraints).
- [ ] **Step 2:** `cd api_go && go test ./...` und `cd ui && pnpm test && npx tsc --noEmit && pnpm build`.
- [ ] **Step 3:** `pnpm test i18nParity`.
- [ ] **Step 4:** Commit.
