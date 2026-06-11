# AI-Chat-Assistent — Design

**Datum:** 2026-06-11
**Status:** Entwurf zur Review

## Ziel

Ein schwebendes AI-Chatfenster unten rechts im Desktop-UI, dem der User Befehle
in natürlicher Sprache geben kann — z.B. „Such mir die Kleine Nachtmusik" —
worauf der Assistent die Notensammlung durchsucht und direkt zur Detailseite
des Treffers navigiert.

**Bewusste Architekturentscheidung:** Kein MCP-Server. Das Chatfenster ist ein
interner Client; Backend und Tools gehören uns beiden Seiten. Mistral Function
Calling (OpenAI-kompatible API, die `aiService.go` bereits nutzt) reicht aus.
Ein MCP-Server wird erst relevant, wenn externe AI-Clients (Claude Desktop
o.ä.) SmartOrganizr ansteuern sollen — das ist explizit nicht Teil dieser V1
und kann später als dünne Schicht über dieselben Tools gelegt werden.

## Scope (V1)

- **Suchen:** nur Musiknoten (Titel/Komponist/Arrangeur), über die bestehende
  Notensuche, gescoped auf den eingeloggten User.
- **Navigieren:** zur Noten-Detailseite per react-router, ausgelöst durch ein
  SSE-Event vom Backend.
- **Streaming:** Antworten erscheinen live (Token für Token).
- **Sessions:** mehrere benannte Konversationen pro User, serverseitig
  persistiert, überleben Reloads.
- **Nicht in V1:** Schreiboperationen (Noten bearbeiten/anlegen/löschen),
  Suche nach Konzerten/Club-Events, Session-Umbenennen, Mobile-Layout,
  MCP-Server.

## Datenmodell

Migration `api_go/data/sql/migrations/00024_ai_chat.sql` (5-stellige
Nummerierung beibehalten — sqlc-Generierung hängt am Padding). Queries
ausschließlich über sqlc in `query.sql`, kein handgeschriebenes DB-Go.

```sql
CREATE TABLE ai_chat_session (
    id         VARCHAR(36) PRIMARY KEY,          -- UUID
    user_fk    VARCHAR(255) COLLATE utf8mb4_general_ci NOT NULL,
    title      VARCHAR(255) NOT NULL DEFAULT '', -- erste User-Nachricht, auf 80 Zeichen gekürzt
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- kein ON UPDATE CURRENT_TIMESTAMP: updated_at wird bewusst nur über die
    -- explizite Touch-Query fortgeschrieben, damit z.B. Titel-Updates die
    -- Session-Sortierung nicht verändern
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_chat_session_user FOREIGN KEY (user_fk)
        REFERENCES user(id) ON DELETE CASCADE,
    INDEX idx_ai_chat_session_user (user_fk, updated_at)
);

CREATE TABLE ai_chat_message (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_fk VARCHAR(36) NOT NULL,
    role       VARCHAR(16) NOT NULL,             -- 'user' | 'assistant' (VARCHAR statt ENUM, Stil von club_events.event_type)
    content    TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_chat_message_session FOREIGN KEY (session_fk)
        REFERENCES ai_chat_session(id) ON DELETE CASCADE,
    INDEX idx_ai_chat_message_session (session_fk, created_at)
);
```

Die FK-Spalte `user_fk` folgt der Projektkonvention VARCHAR(255) +
`utf8mb4_general_ci` (sonst MySQL Error 3780).

Persistiert werden nur finale User- und Assistant-Nachrichten. Tool-Aufrufe
und Tool-Ergebnisse sind flüchtig und werden nicht gespeichert.

## API

Alle Endpunkte authentifiziert; jeder Zugriff prüft `user_fk` gegen den
eingeloggten User. Bei fehlender AI-Konfiguration (`SMARTORGANIZR_AI_TOKEN`
leer) antworten alle Endpunkte 503, analog zu `identify-music`.

| Endpunkt | Zweck |
|---|---|
| `GET    /api/v1/ai/chat/sessions` | Session-Liste (id, title, updated_at), sortiert nach updated_at absteigend |
| `POST   /api/v1/ai/chat/sessions` | Neue (leere) Session anlegen (title = "", wird mit der ersten Nachricht gesetzt), gibt id zurück |
| `GET    /api/v1/ai/chat/sessions/:sessionId/messages` | Nachrichten einer Session |
| `POST   /api/v1/ai/chat/sessions/:sessionId/messages` | Nachricht senden → SSE-Stream |
| `DELETE /api/v1/ai/chat/sessions/:sessionId` | Session samt Nachrichten löschen (CASCADE) |

Zusätzlich liefert der bestehende Public-Config-Weg ein `aiEnabled`-Flag,
damit das Frontend den Chat-Button nur bei konfigurierter AI rendert.

### SSE-Events des Message-POST

| Event | Payload | Bedeutung |
|---|---|---|
| `token` | `{ "text": string }` | Textstück der laufenden Antwort |
| `tool` | `{ "status": string }` | Statusanzeige, z.B. „Suche nach ‚Kleine Nachtmusik'…" |
| `navigate` | `{ "path": string }` | Frontend soll per react-router dorthin navigieren |
| `done` | `{}` | Antwort vollständig, persistiert |
| `error` | `{ "message": string }` | Stream abgebrochen |

## Backend: Agent-Loop & Tools

Neuer Service `api_go/service/aiChatService.go` neben dem bestehenden
`aiService.go`; gleiche Konfiguration (BaseURL/Token/Model), gleicher
OpenAI-kompatibler Endpunkt, zusätzlich `stream: true` und `tools`.

Ablauf pro eingehender Nachricht:

1. Session laden, Berechtigung prüfen, User-Nachricht persistieren. Ist es
   die erste Nachricht der Session, Titel daraus ableiten (80 Zeichen).
2. Kontext bauen: Systemprompt + letzte 20 Nachrichten der Session.
3. Mistral `chat/completions` streamend aufrufen.
4. **Agent-Loop, max. 5 Iterationen:**
   - Modell antwortet mit `tool_calls` → Tool serverseitig ausführen,
     `tool`-Status-Event an den Client, Tool-Ergebnis als Tool-Message
     anhängen, erneut aufrufen.
   - Modell antwortet mit Text → Tokens live als `token`-Events durchreichen.
5. Finale Assistant-Nachricht persistieren, `updated_at` der Session
   aktualisieren, `done`-Event senden.

### Tools

**`search_notes(query: string)`**
Ruft die bestehende Notensuche auf (derselbe Service-Pfad wie `GetNotes`),
gescoped auf den User. Rückgabe ans Modell: kompakte JSON-Liste mit `id`,
`title`, `composer`, `folder`; maximal 10 Treffer.

**`navigate_to(path: string)`**
Wird nicht serverseitig ausgeführt. Das Backend validiert den Pfad gegen eine
Whitelist (V1: Noten-Detailseite, z.B. `/notes/:id`), sendet das
`navigate`-SSE-Event und gibt dem Modell „Navigation ausgelöst" als
Tool-Ergebnis zurück. Pfade außerhalb der Whitelist werden abgelehnt und dem
Modell als Fehler gemeldet.

### Systemprompt (Kernaussagen)

- Du bist der Assistent von SmartOrganizr (Notenverwaltung für Musikvereine).
- Nutze `search_notes` für jede Suchanfrage; erfinde keine Treffer.
- Genau ein Treffer → direkt `navigate_to` aufrufen und kurz bestätigen.
  Mehrere Treffer → auflisten und nachfragen. Kein Treffer → sagen.
- Antworte in der Sprache der User-Nachricht.

## Frontend

Neuer Komponentenordner `ui/src/components/aichat/`:

- **`AIChatLauncher`** — schwebender Button unten rechts, nur Desktop, nur
  wenn `aiEnabled`. Eingebunden im Haupt-Layout.
- **`AIChatPanel`** — Chatfenster mit Nachrichtenliste, Eingabezeile und
  Session-Auswahl („Neuer Chat", Löschen-Icon pro Session).

Neuer zustand-Store `ui/src/store/aiChatStore.ts`: Panel offen/zu, aktive
Session, Nachrichten, Streaming-Status.

Streaming-Empfang per `fetch` POST + `ReadableStream` (SSE-Zeilen parsen —
`EventSource` kann kein POST):

- `token` → an die wachsende Assistant-Bubble anhängen,
- `tool` → Statuszeile („🔍 Suche…"),
- `navigate` → `useNavigate(path)`; das Panel bleibt geöffnet,
- `done` / `error` → Streaming-Status beenden.

Alle Texte zweisprachig über das bestehende i18n-System
(`ui/src/language/`).

## Fehlerbehandlung

- AI nicht konfiguriert: Button nicht gerendert, Endpunkte 503.
- Fehler/Timeout mitten im Stream: `error`-Event → Fehler-Bubble; die
  User-Nachricht ist bereits persistiert und kann erneut gesendet werden.
- Tool-Fehler (DB, ungültiger Pfad): Fehlertext als Tool-Ergebnis ans Modell
  zurück — der Loop bricht nicht hart ab, das Modell kann reagieren.
- Schutzmechanismen: max. 5 Agent-Iterationen, serverseitiger
  Request-Timeout, Navigations-Whitelist.

## Tests

- **Go-Unit-Tests** für den Agent-Loop gegen einen httptest-Mock des
  Mistral-Endpunkts: Szenario Tool-Call-Runde → Tool-Ergebnis → finale
  Streaming-Antwort; außerdem Navigate-Whitelist und SSE-Encoding.
- **sqlc-Queries** nach bestehendem Muster.
- **Frontend:** manuelle Verifikation des End-to-End-Flows (Frage → Suche →
  Navigation), da keine etablierte UI-Testinfrastruktur existiert.

## Spätere Ausbaustufen (nicht V1)

- Schreib-Tools (`update_note`) mit Bestätigungsdialog im Chat.
- Suche über Konzerte und Club-Events.
- MCP-Server als dünne Schicht über denselben Tool-Implementierungen für
  externe AI-Clients.
- Session-Umbenennen, Mobile-Ansicht.
