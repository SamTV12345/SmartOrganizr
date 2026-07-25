# Feature-Vervollständigung — Design

**Date:** 2026-07-25
**Status:** Approved

## Ausgangslage

Ein Audit über API-Routen gegen UI-Aufrufe, die vorhandenen Specs gegen den
Ist-Zustand und die Kern-Views hat ergeben: mehrere Features lösen die
Versprechen ihrer eigenen Spec nur zur Hälfte ein, und ein Querschnittsproblem
macht die englische Sprachversion praktisch unbrauchbar. Dieses Dokument
schließt diese Lücken. Es entwirft **keine** neuen Features — jeder Punkt ist
ein bereits zugesagtes Verhalten, das fehlt oder falsch ist.

Nicht Teil dieser Spec (bleibt bewusst offen): serienweites Bearbeiten von
Terminen, Register-Chats/-Dateien, mehrere Register pro Mitglied, AI-Schreib-Tools,
Pinnwand-Kommentare/-Reaktionen, Datei-Versionierung und -Vorschau,
Markdown auf der Pinnwand.

### Korrektur zum ersten Audit-Eindruck

`sectionLeader` wird **nicht** ignoriert: `rowVisible`
(`api_go/service/clubEventService.go:521`) wertet es beim Sichtbarkeitstoken
`"section"` aus, und `"section"` steht in `ui/src/models/clubSettings.ts` zur
Wahl. Das Leserecht auf die Anwesenheit des eigenen Registers ist fertig.
Fehlt nur das Schreibrecht und das Umbenennen von Registern im UI.

## Querschnitt: ein Datumsformat, eine Sprache

### Datumsformatierung

Heute existieren drei Formatierungswege parallel: `format(..., { locale: de })`
mit fest verdrahtetem deutschen Locale (`DashboardView`,
`ClubPinboardSection`, `ClubFilesSection`, `GeburtstagAdresseEdit`),
`toLocaleString("de-DE")` (`MyMessagesView`) und nacktes `toLocaleString()`
ohne Locale (`ClubEventsManager`, `InventoryView`, `NoteDetailView`). Ein
Nutzer sieht also je nach Bildschirm ein anderes Format, und die
EN-Oberfläche zeigt deutsche Datumsangaben.

Neuer Hook `ui/src/hooks/useDateFormat.ts`:

- liest die aktive Sprache aus `i18n.language`
- wählt daraus das date-fns-Locale (`de` bzw. `enUS`)
- liefert `formatDateTime(iso)`, `formatDate(iso)`, `formatTime(iso)`
- gibt bei fehlendem/ungültigem Input `""` zurück (das tun die vorhandenen
  lokalen `formatDate`-Helfer heute schon, das Verhalten bleibt)

Alle oben genannten Aufrufstellen gehen darauf; die lokalen
`formatDate`-Duplikate in den einzelnen Komponenten entfallen.

### i18n

Die Keys sind zwar in Parität (318/318 in `de.json`/`en.json`), aber ganze
Views rufen `t()` nie auf. Betroffen mit geschätzter Stringzahl:
`ClubDetailView` (~45), `MyMessagesView` (~19, vollständig unübersetzt),
`InviteAcceptView` (~12), `NoteDetailView` (~8), `ImportExportView` (~7),
`MyManagement` (~6), `EventView` (~3), dazu Einzelfälle in `AuthorView`,
`SearchElementView`, `FolderView`, `ProfileEdit`.

Vorgehen:

- Neue Key-Gruppen pro View: `club.*`, `messages.*`, `noteDetail.*`,
  `invite.*`, `io.*`, `events.*`. Bestehende Gruppen (`pinboard.*`, `files.*`,
  `inventory.*`, `clubEvents.*`, `sections.*`, `dashboard.*`, `aiChat.*`)
  bleiben unangetastet.
- `ROLE_OPTIONS` und `CLUB_SECTIONS` in `ClubDetailView` halten künftig
  Key-Referenzen statt Literale (`club.role.LEITER.label` /
  `club.role.LEITER.description`, `club.tab.pinnwand`).
- `de.json` und `en.json` werden gleichzeitig gefüllt; EN wird echt übersetzt,
  nicht mit deutschem Text belegt.
- Regressionsschutz: vitest-Test, der beide JSON-Dateien flach zieht und auf
  identische Key-Mengen prüft. Den gibt es heute nicht.

## Paket 1: Inventur

### QR-Code für den Mappen-Tag

Die Spec verspricht „the URL (+ QR to print)" und einen „printable QR";
`FolderRow` in `InventoryView.tsx` zeigt nur die URL mit Kopierknopf.

- Neue Abhängigkeit `qrcode` (~50 kB, kein React-Bezug), **lazy** importiert
  nach dem Muster von tesseract.js, damit das Hauptbundle unberührt bleibt.
- Nach dem Binden rendert `FolderRow` das QR als Data-URL neben der URL.
- Button „Drucken": öffnet eine Druckansicht mit ausschließlich Mappenname und
  QR, per Druck-Stylesheet auf ~5×5 cm Kantenlänge gesetzt (die Größe, bei der
  laut Spec das Scannen zuverlässig ist).

### Inventarnummer an der Note

`POST /v1/inventory/notes/{noteId}/number` wird von keiner Zeile im Frontend
aufgerufen — toter Endpoint, obwohl die Spec sagt, die Nummer werde „everywhere
as `Nr. 421`" angezeigt. Serverseitig existiert `AssignInventoryNo` bereits.

- `inventoryNo` (nullable) wandert in das Note-DTO und damit in
  `GET /v1/elements/notes/{noteId}`.
- `NoteDetailView` zeigt „Nr. 421" in den Metadaten.
- Fehlt die Nummer, erscheint dort „Nummer vergeben" und ruft den vorhandenen
  Endpoint auf (der ist idempotent und liefert eine bestehende Nummer zurück).

### Verschachtelte Mappen sweepbar machen

Heute lädt `InventoryView` nur `GET /v1/elements/parentDecks` — Wurzelordner.
Jede Mappe eine Ebene tiefer ist von der Inventur ausgeschlossen. Beide in der
Spec genannten Einstiegspunkte werden gebaut:

1. **Ordner-Suchfeld** im Inventur-Screen auf Basis von
   `GET /v1/elements/folders?folderName=&page=` (paginierte Ordnersuche,
   existiert; `ParentFolderSearchBar` nutzt sie schon) — neben der Root-Liste,
   nicht statt ihr.
2. **„Inventur starten" am Ordner** in `FolderView`/`Tree`: navigiert nach
   `/inventory?folderId=<id>`, was den Sweep für diesen Ordner direkt startet —
   analog zum bestehenden `?tag=<uuid>`-Deep-Link.

### Report vertiefen

- **Verlinkung:** Report-Einträge verlinken auf
  `/noteManagement/notes/{noteId}`. Die Spec fordert das ausdrücklich für die
  fehlenden Stücke; es gilt für alle vier Abschnitte.
- **Per-Item-Dismiss:** blendet eine Zeile rein clientseitig aus. Bewusst kein
  Serverzustand: Dismiss heißt „gesehen", nicht „erledigt". Beim nächsten Sweep
  taucht der Punkt wieder auf, wenn er weiter besteht — genau richtig.
- **Historie:** heute ist der Report nach dem Verlassen des Screens weg,
  obwohl `inventory_sweep` und `inventory_sighting` alles speichern.
  Neu: `GET /v1/inventory/sweeps` (die letzten 20 abgeschlossenen Sweeps des
  Nutzers: id, Ordnername, `completed_at`, Anzahl Sichtungen) und
  `GET /v1/inventory/sweeps/{id}` mit der **Sichtungsliste** dieses Sweeps
  (Note, Nummer, `matched_via`, `incomplete`).

  Ausdrücklich **nicht** der nachträglich berechnete Diff: „fehlt" ist gegen
  den *heutigen* `parent` definiert, ein später berechneter Diff wäre historisch
  falsch und würde Bewegungen zeigen, die es zum Sweep-Zeitpunkt nicht gab.
  Die Sichtungsliste ist die Tatsache, die der Sweep festgestellt hat.

### Sweep abbrechen

Es gibt nur „Fertig". Wer einen Sweep verlässt, hinterlässt eine Zeile mit
`completed_at IS NULL`, die nie wieder angefasst wird.

- `DELETE /v1/inventory/sweeps/{id}` löscht einen eigenen Sweep, solange
  `completed_at IS NULL`; auf einen abgeschlossenen Sweep antwortet er `409`
  (Historie darf nicht stillschweigend verschwinden).
- Button „Abbrechen" im Sweep-Screen, mit Rückfrage wenn schon Sichtungen
  erfasst sind.

## Paket 2: Dashboard und Termine

### Dashboard zeigt die eigenen Vereinstermine

`UpcomingEventsCard` fragt `/v1/events/{userId}` ab — den iCal-Spiegel. Die
nativen Club-Termine (`/v1/club-events`) fehlen vollständig, obwohl sie das
Feature sind, an dem am längsten gebaut wurde.

- Die Karte lädt beide Quellen und mischt sie nach Startdatum (weiterhin die
  nächsten fünf).
- Herkunfts-Badge pro Zeile: Kalender-Abo oder Verein (mit Vereinsname).
- Reine UI-Änderung, `ListMyClubEvents` liefert alles Nötige.

### Karte „Zusage ausstehend"

`ClubEventDto.myStatus` existiert (`""` = unentschieden) und
`ClubEventResponseControls` auch — es fehlt nur die Zusammenführung.

- Neue Dashboard-Karte listet Club-Termine mit `myStatus === ""`.
- Antworten direkt in der Karte über `ClubEventResponseControls`; keine
  API-Änderung.

### Attendance-N+1

`AttendanceMatrix` feuert pro Event-Karte eine eigene Query — bei 20 Terminen
20 Requests, von denen die meisten für ein Nichtmitglied der Leitung ohnehin
leer zurückkommen.

- Die Matrix lädt erst beim Aufklappen („Rückmeldungen anzeigen"), nicht mehr
  automatisch. Die Zählerzeile (`yesCount` … `undecidedCount`) steckt schon im
  Event-DTO; die Matrix ist Detail und gehört hinter eine Interaktion.

### Vergangene Termine

`since` ist fix auf „jetzt" gesetzt, es gibt keinen Weg in die Vergangenheit —
und damit keine Anwesenheitshistorie.

- Umschalter „Vergangene Termine": setzt `since` auf sechs Monate zurück und
  sortiert absteigend. Der Endpoint akzeptiert `since` bereits.

### Serien-Semantik sichtbar machen

Das Bearbeiten einer Serieninstanz trifft immer nur diese eine Instanz
(bewusste Designentscheidung der Events-Spec) — im UI steht davon nichts.

- Hinweiszeile beim Bearbeiten eines Termins mit `seriesId`: „gilt nur für
  diesen Termin".
- Das Serien-Badge zeigt die Frequenz statt nur „Serie".
- Serienweites Bearbeiten bleibt außerhalb dieser Spec.

### Absage rückgängig machen

`cancel` ist einseitig; ein versehentlich abgesagter Termin bleibt abgesagt.

- `POST /v1/clubs/{clubId}/events/{eventId}/reinstate` als Gegenstück, gleiche
  Rechteprüfung wie `cancel`, setzt `cancelled` zurück und benachrichtigt die
  Betroffenen wie die Absage.
- Button erscheint nur bei abgesagten Terminen.

### Registerleiter dürfen Register-Termine verwalten

Create/Update/Delete/Cancel gehen durch `requireManager` → nur `LEITER` und
`CO_LEITER`. Ein Registerleiter kann die Anwesenheit seines Registers sehen,
aber keinen Registertermin anlegen.

Serverseitig ersetzt `requireEventManager(clubID, userID, sectionID)` das
pauschale `requireManager` in diesen vier Operationen:

- `LEITER`/`CO_LEITER`: unverändert alles erlaubt.
- Registerleiter: erlaubt, wenn der Termin auf **sein** Register zielt.
- Beim Ändern müssen **alte und neue** Zielsektion die eigene sein. Sonst
  könnte ein Registerleiter einen Termin aus seinem Register heraus- oder einen
  vereinsweiten Termin an sich ziehen.
- Alle anderen: `403`.

Permissions-DTO bekommt `can_manage_section_events` (bool) und `my_section_id`
(string, leer wenn ohne Register). `ClubEventsManager` zeigt dem Registerleiter
das Formular mit auf sein Register festgenageltem Select — die Auswahl
„gesamter Verein" ist für ihn nicht wählbar.

## Paket 3: Kanten

### AI-Chat

- **Mobil:** unter dem `sm`-Breakpoint ein Vollbild-Sheet statt fixer
  `w-96 h-[32rem]` (384 px sind auf einem 360-px-Gerät unbenutzbar). Die
  Events-Spec des Chats führt „Mobile-Ansicht" als offenen Punkt.
- **Theme:** `bg-gray-700`/`bg-gray-600`/`bg-blue-600` werden zu Theme-Tokens
  (`bg-card`, `bg-muted`, `bg-primary`, `text-foreground` …). Erst damit
  funktioniert der Dark/Light-Umschalter des restlichen UIs auch im Chat.
- **Stop-Button** während des Streamings — der `AbortController` ist schon
  verdrahtet, es fehlt der Knopf.
- **Rückfrage** vor dem Löschen einer Session (heute löscht ein Klick sofort).

### Nachrichten

- Auto-Scroll auf die neueste Nachricht, auch wenn sie per SSE-Invalidierung
  nachkommt.
- Enter sendet, Shift+Enter macht einen Umbruch (heute sendet nur der Knopf).
- Pagination: `GET .../messages/chats/{chatId}` bekommt `limit` und `before`,
  das UI einen „Ältere laden"-Knopf. Heute lädt jeder Chatwechsel den
  vollständigen Verlauf.

### Dateien

- Upload-Fortschritt über `onUploadProgress` statt des Platzhalters `…`.
- Upload-Fehler werden angezeigt; heute wird nur die Größe geprüft und ein
  serverseitiger Fehler verschwindet still.
- `hub.Publish` mit `type: "club_file"` beim Upload, damit neue Dateien
  dieselbe Live-Aktualisierung auslösen wie Pinnwand-Posts. Der
  `NotificationProvider` bekommt den Fall und invalidiert `club-files`.

### Pinnwand

- Beim Bearbeiten scrollt das Formular in den Blick (es sitzt oben; bei einem
  Post weiter unten passiert heute sichtbar nichts).
- Pagination analog zu den Nachrichten.

### Register

- Umbenennen im UI über den vorhandenen
  `PUT /v1/clubs/{clubId}/sections/{sectionId}` — bisher nur Anlegen und
  Löschen erreichbar.

## Tests

**Go-Integrationstests** (testcontainers, Auth auf `"12345"` gepinnt, Muster
der Dateien in `api_go/tests/`):

- Sweep-Abbruch: eigener offener Sweep wird gelöscht; abgeschlossener Sweep
  ergibt `409`; fremder Sweep ergibt `403`/`404`.
- Sweep-Historie: nur abgeschlossene, nur eigene, absteigend; Detailabruf
  liefert die Sichtungen.
- Inventarnummer: `inventoryNo` erscheint im Note-DTO nach Zuweisung.
- `reinstate`: hebt die Absage auf, Rechte wie `cancel`.
- Registerleiter-Rechte in allen Richtungen: eigenes Register erlaubt, fremdes
  `403`, Verschieben in ein fremdes Register `403`, vereinsweiter Termin `403`,
  Mitglied ohne Leiterflag `403`.
- Nachrichten-Pagination: `limit`/`before` schneiden korrekt.
- `club_file`-Benachrichtigung wird beim Upload publiziert (Muster:
  `notification_publish_test.go`).

**Vitest:**

- `useDateFormat`: Locale folgt der Sprache, ungültige Eingabe ergibt `""`.
- de/en-Key-Parität.
- Dashboard-Merge: zwei Quellen, Sortierung nach Startdatum, Begrenzung auf
  fünf.

## Reihenfolge

1. **i18n und `useDateFormat`** zuerst. Die Pakete danach fassen genau dieselben
   Dateien an; in umgekehrter Reihenfolge müsste jeder neue String zweimal
   angefasst werden.
2. **Inventur** (in sich geschlossen, berührt die Club-Features nicht).
3. **Dashboard und Termine** (Server- und UI-Anteil, größter Anteil neuer
   Endpunkte).
4. **Kanten** (unabhängig voneinander, gut parallelisierbar).
