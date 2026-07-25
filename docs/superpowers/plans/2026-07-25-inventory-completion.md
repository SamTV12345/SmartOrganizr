# Paket 2: Inventur zu Ende bringen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Abgeschlossen am 2026-07-25 (Commits 95a1e15 Server, 63fe2f1 UI).

**Goal:** Die Inventur löst die Versprechen ihrer Spec vollständig ein: druckbarer QR-Code pro Mappe, Inventarnummer an der Note, verschachtelte Mappen sweepbar, ein Report mit Verlinkung, Dismiss und Historie, und ein abbrechbarer Sweep.

**Architecture:** Serverseitig drei Ergänzungen am bestehenden `InventoryService` (Sweep abbrechen, Sweep-Historie, `inventoryNo` in der Last-Seen-Antwort) — keine Migration, die Tabellen tragen alles schon. Clientseitig wächst `InventoryView` um Ordnersuche, QR-Druck, Historie und Abbrechen; `NoteDetailView` bekommt Nummer und Nummernvergabe; `FolderView`/`Tree` einen Einstiegspunkt.

**Tech Stack:** Go 1.26 + Fiber v3 + sqlc + goose, MySQL; React 19 + TanStack Query + vitest; neue UI-Abhängigkeit `qrcode`.

## Global Constraints

- **Keine Migration.** `inventory_sweep`, `inventory_sighting`, `mappe_tag` und `elements.inventory_no` existieren (Migrationen 00028/00029/00030 sind der Stand).
- SQL nur in `api_go/data/sql/queries/query.sql`, danach `cd api_go && sqlc generate`. Keine handgeschriebenen `db/*_queries.go`.
- Nach Änderungen an Endpunkten oder DTOs: `cd api_go && go run github.com/swaggo/swag/cmd/swag@v1.16.6 init --parseDependency --parseInternal -o docs` und dann `cd ui && pnpm gen:api`. Beides ist reproduzierbar und muss mitcommittet werden.
- UI-Typen kommen aus `ui/src/api/types.ts` als Aliase auf `schema.ts` — niemals handgeschriebene Spiegel.
- Testkommandos: `cd api_go && go test ./...` (braucht die Apple-Container-Umgebung aus `docs/apple-container-testing.md`: `container system start`, `socktainer &`, `DOCKER_HOST`, `TESTCONTAINERS_RYUK_DISABLED=true`), `cd ui && pnpm test`, `cd ui && npx tsc --noEmit`.
- Neue Strings gehen in die `inventory.*`-Gruppe in `de.json` **und** `en.json`; der Paritätstest aus Paket 1 wacht darüber.
- Auth in Integrationstests ist auf den Benutzer `"12345"` gepinnt; Muster siehe `api_go/tests/inventory_test.go`.

---

### Task 1: Sweep abbrechen (Server)

**Files:**
- Modify: `api_go/data/sql/queries/query.sql`, `api_go/service/inventoryService.go`, `api_go/controllers/inventory.go`, `api_go/routers/setupRouter.go`
- Test: `api_go/tests/inventory_test.go`

**Interfaces:**
- Produces: `(*InventoryService).CancelSweep(userID, sweepID string) error` — `ErrInventoryNotFound` für fremde/unbekannte Sweeps, `ErrSweepCompleted` für abgeschlossene. Route `DELETE /v1/inventory/sweeps/:sweepId` → 204.

- [x] **Step 1: Write the failing test**

In `api_go/tests/inventory_test.go`: ein Test, der einen Sweep anlegt, ihn per `DELETE` abbricht (204 erwartet) und danach prüft, dass eine Sichtung auf diesen Sweep 404 liefert; ein zweiter Test schließt einen Sweep ab und erwartet auf `DELETE` 409.

- [x] **Step 2: Run it and watch it fail**

Run: `cd api_go && go test ./tests/ -run TestInventorySweepCancel -v`
Expected: FAIL (404 statt 204, Route existiert nicht).

- [x] **Step 3: Add the query**

In `query.sql`, im Inventur-Abschnitt:

```sql
-- name: DeleteIncompleteInventorySweep :execrows
DELETE FROM inventory_sweep WHERE id = ? AND user_fk = ? AND completed_at IS NULL;
```

Danach `sqlc generate`.

- [x] **Step 4: Service method**

`CancelSweep` prüft via `ownedSweep` (liefert `ErrInventoryNotFound`), lehnt `sweep.CompletedAt.Valid` mit `ErrSweepCompleted` ab und löscht dann über die neue Query. Die Sichtungen verschwinden per `ON DELETE CASCADE` mit.

- [x] **Step 5: Controller and route**

`DeleteInventorySweep` mit swag-Annotation (`@Success 204`, `@Failure 409`), Route `r.Delete("/sweeps/:sweepId", controllers.DeleteInventorySweep)` in der `v1/inventory`-Gruppe.

- [x] **Step 6: Green + commit**

Run: `cd api_go && go test ./tests/ -run TestInventorySweep -v`
Expected: PASS. Dann Docs regenerieren und committen.

---

### Task 2: Sweep-Historie (Server)

**Files:**
- Modify: `api_go/service/inventoryService.go`, `api_go/controllers/inventory.go`, `api_go/routers/setupRouter.go`
- Test: `api_go/tests/inventory_test.go`

**Interfaces:**
- Produces:
  - `type SweepHistoryEntry struct { SweepID, FolderID, FolderName, CompletedAt string; SightingCount int }`
  - `type SweepDetail struct { SweepID, FolderID, FolderName, CompletedAt string; Sightings []SweepSighting }`
  - `type SweepSighting struct { NoteID, Name, MatchedVia string; InventoryNo *int32; Incomplete bool }`
  - `(*InventoryService).SweepHistory(userID string, limit int) ([]SweepHistoryEntry, error)`
  - `(*InventoryService).SweepDetail(userID, sweepID string) (SweepDetail, error)`
  - Routes `GET /v1/inventory/sweeps` und `GET /v1/inventory/sweeps/:sweepId`.

Die vorhandenen Queries reichen: `ListCompletedSweepsForUser` (nur abgeschlossene, absteigend) und `ListSightingsForSweeps` (Sichtungen für eine Menge von Sweeps). Die Historie liefert **die Sichtungsliste, nicht einen neu berechneten Diff** — „fehlt" ist gegen den heutigen `parent` definiert und wäre nachträglich historisch falsch.

- [x] **Step 1: Write the failing test**

Test: zwei Sweeps über verschiedene Ordner anlegen, einen mit Sichtung abschließen, den anderen offen lassen. `GET /v1/inventory/sweeps` liefert genau den abgeschlossenen, mit Ordnername und `sightingCount: 1`. `GET /v1/inventory/sweeps/{id}` liefert die Sichtung mit Notennamen. Ein fremder Sweep (über `testQueries` für einen anderen Benutzer angelegt) ergibt 404.

- [x] **Step 2: Run and watch it fail**

Run: `cd api_go && go test ./tests/ -run TestInventorySweepHistory -v`
Expected: FAIL (404, Routen fehlen).

- [x] **Step 3: Implement service, controller, routes**

`SweepHistory`: `ListCompletedSweepsForUser`, auf `limit` (Default 20) kürzen, Sichtungszahlen in einem Aufruf von `ListSightingsForSweeps` über alle IDs zählen. `SweepDetail`: `ownedSweep` für die Rechteprüfung, dann `ListSightingsForSweep`.

- [x] **Step 4: Green, regenerate docs, commit**

---

### Task 3: Inventarnummer in der Last-Seen-Antwort (Server)

**Files:**
- Modify: `api_go/service/inventoryService.go`
- Test: `api_go/tests/inventory_test.go`

**Interfaces:**
- Produces: `InventoryLookup.InventoryNo *int32` mit JSON-Tag `inventoryNo,omitempty` — gefüllt in `LastSeen` und `Lookup`.

`LastSeen` lädt die Note schon per `FindFolderById`; die Zeile trägt `inventory_no`. Damit braucht die Notendetailseite keinen zusätzlichen Endpunkt, um „Nr. 421" anzuzeigen.

- [x] **Step 1: Write the failing test**

Test: Note anlegen, `POST /v1/inventory/notes/{id}/number` aufrufen, dann `GET /v1/inventory/notes/{id}/last-seen` — erwartet `inventoryNo` gleich der vergebenen Nummer.

- [x] **Step 2: Run and watch it fail** — Feld fehlt, JSON hat keinen `inventoryNo`.

- [x] **Step 3: Add the field and populate it in LastSeen and Lookup**

- [x] **Step 4: Green, regenerate docs, commit**

---

### Task 4: QR-Code für den Mappen-Tag (UI)

**Files:**
- Modify: `ui/package.json` (Abhängigkeit `qrcode`), `ui/src/pages/InventoryView.tsx`, `ui/src/language/json/de.json`, `ui/src/language/json/en.json`
- Create: `ui/src/utils/QrCode.ts`, `ui/src/utils/QrCode.test.ts`

**Interfaces:**
- Produces: `renderQrDataUrl(text: string): Promise<string>` — lazy-importiert `qrcode` und liefert eine PNG-Data-URL; `printQrCode(dataUrl: string, caption: string): void` öffnet ein Druckfenster mit QR und Mappenname.

Die Spec verspricht „the URL (+ QR to print)"; `FolderRow` zeigt bisher nur die URL. Der Import läuft **lazy** wie tesseract.js, damit das Hauptbundle unberührt bleibt.

- [x] **Step 1: Install the dependency**

Run: `cd ui && pnpm add qrcode && pnpm add -D @types/qrcode`

- [x] **Step 2: Write the failing test**

`QrCode.test.ts`: `renderQrDataUrl("https://example.org/ui/inventory?tag=abc")` liefert einen String, der mit `data:image/png;base64,` beginnt; leerer Text wird abgelehnt (Promise rejects oder leerer String — im Test festnageln).

- [x] **Step 3: Run and watch it fail** — `cd ui && pnpm test QrCode`, Modul existiert nicht.

- [x] **Step 4: Implement `QrCode.ts`**

`renderQrDataUrl` mit `const QRCode = (await import("qrcode")).default` und `toDataURL(text, { width: 512, margin: 1 })`. `printQrCode` schreibt ein minimales Dokument in ein `window.open`-Fenster: nur `<img>` mit `width: 5cm; height: 5cm` und die Beschriftung, plus `@page { margin: 1cm }`; ruft danach `print()`. 5 cm ist die Kantenlänge, bei der laut Spec das Scannen zuverlässig ist.

- [x] **Step 5: Wire it into `FolderRow`**

Nach dem Binden zusätzlich zum URL-Feld das QR-Bild anzeigen und einen „Drucken"-Knopf (`inventory.printTag`).

- [x] **Step 6: Green + commit**

Run: `cd ui && pnpm test && npx tsc --noEmit`

---

### Task 5: Verschachtelte Mappen sweepbar machen (UI)

**Files:**
- Modify: `ui/src/pages/InventoryView.tsx`, `ui/src/pages/FolderView.tsx`, `ui/src/components/Tree.tsx`, `ui/src/language/json/*.json`

**Interfaces:**
- Consumes: `GET /v1/elements/folders?folderName=&page=` (existiert, paginiert).
- Produces: Deep-Link `/inventory?folderId=<id>` — startet den Sweep für diesen Ordner, analog zum vorhandenen `?tag=<uuid>`.

Heute lädt `InventoryView` nur `parentDecks` (Wurzelordner); jede Mappe eine Ebene tiefer ist von der Inventur ausgeschlossen.

- [x] **Step 1: Folder search in the inventory screen**

Suchfeld über der Wurzelordner-Liste: tippen → `GET /v1/elements/folders` (debounced über den vorhandenen `useDebounce`), Treffer als Zeilen mit „Inventur starten". Die Wurzelliste bleibt als Schnellzugriff.

- [x] **Step 2: `?folderId=` deep link**

In `InventoryView` einen zweiten Effekt neben dem `tag`-Effekt: `folderId` aus den Suchparametern lesen, Ordnernamen aus der Trefferliste oder per `GET /v1/elements/notes/{id}`-Ersatz nicht nötig — der Name kommt als zweiter Suchparameter `folderName` mit, damit kein Extra-Request nötig ist; fehlt er, wird der Sweep mit leerem Namen gestartet und der Report zeigt den Ordnernamen vom Server.

- [x] **Step 3: Entry point on the folder**

In `FolderView`/`Tree` pro Ordner eine Aktion „Inventur starten", die auf `/inventory?folderId=<id>&folderName=<name>` navigiert.

- [x] **Step 4: Verify manually and commit**

Run: `cd ui && pnpm test && npx tsc --noEmit`

---

### Task 6: Report vertiefen und Sweep abbrechen (UI)

**Files:**
- Modify: `ui/src/pages/InventoryView.tsx`, `ui/src/pages/NoteDetailView.tsx`, `ui/src/api/types.ts`, `ui/src/language/json/*.json`
- Create: `ui/src/utils/SweepReport.ts`, `ui/src/utils/SweepReport.test.ts`

**Interfaces:**
- Consumes: `DELETE /v1/inventory/sweeps/{id}`, `GET /v1/inventory/sweeps`, `GET /v1/inventory/sweeps/{id}`, `InventoryLookup.inventoryNo` (Tasks 1–3).
- Produces: `dismissEntry(report, section, noteId): SweepReport` — reine Funktion, entfernt einen Eintrag aus einem Abschnitt; `ui/src/api/types.ts` bekommt `SweepHistoryEntry` und `SweepDetail` als Aliase.

- [x] **Step 1: Write the failing test for the pure helper**

`SweepReport.test.ts`: `dismissEntry` entfernt genau den adressierten Eintrag aus dem genannten Abschnitt, lässt die anderen Abschnitte unberührt und mutiert das Original nicht.

- [x] **Step 2: Run and watch it fail**, dann implementieren.

- [x] **Step 3: Report-Einträge verlinken**

`ReportSection` rendert die Einträge als `Link` auf `/noteManagement/notes/{noteId}` und bekommt pro Zeile einen Dismiss-Knopf, der `dismissEntry` anwendet. Rein clientseitig: Dismiss heißt „gesehen", nicht „erledigt".

- [x] **Step 4: Sweep abbrechen**

Im Sweep-Screen neben „Fertig" ein „Abbrechen" — bei bereits erfassten Sichtungen mit `AlertDialog`-Rückfrage. Online ruft es `DELETE /v1/inventory/sweeps/{id}`, offline löscht es den lokalen Pending-Sweep über `deleteIncompletePendingSweepsForFolder`.

- [x] **Step 5: Historie**

Im Leerlauf-Zustand eine Karte „Letzte Inventuren": `GET /v1/inventory/sweeps`, pro Zeile Ordner, Datum (`useDateFormat`) und Anzahl; Klick lädt `GET /v1/inventory/sweeps/{id}` und zeigt die Sichtungsliste (Nummer, Name, `matchedVia`, unvollständig-Markierung).

- [x] **Step 6: Nummer an der Note**

`NoteDetailView`: „Nr. {{no}}" in den Metadaten, wenn `lastSeen.inventoryNo` gesetzt ist; sonst ein Knopf „Nummer vergeben", der `POST /v1/inventory/notes/{id}/number` aufruft und die Query invalidiert.

- [x] **Step 7: Full verification and commit**

Run: `cd ui && pnpm test && npx tsc --noEmit && pnpm build`, dazu `cd api_go && go test ./...`.

---

### Task 7: Abschluss

- [x] **Step 1: Regenerate the API contract**

Run:
```sh
cd api_go && go run github.com/swaggo/swag/cmd/swag@v1.16.6 init --parseDependency --parseInternal -o docs
cd ../ui && pnpm gen:api
```
Erwartung: `schema.ts` enthält die vier neuen Endpunkte und `inventoryNo`.

- [x] **Step 2: Full suites**

Run: `cd api_go && go test ./...` und `cd ui && pnpm test && npx tsc --noEmit`.

- [x] **Step 3: Key parity**

Run: `cd ui && pnpm test i18nParity` — alle neuen `inventory.*`-Keys in beiden Sprachen.

- [x] **Step 4: Commit**
