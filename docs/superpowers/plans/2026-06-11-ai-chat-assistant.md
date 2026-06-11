# AI-Chat-Assistent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Schwebendes AI-Chatfenster (unten rechts, Desktop) mit Mistral Function Calling: Notensuche per natürlicher Sprache, Streaming-Antworten, automatische Navigation zur Noten-Detailseite, persistierte Chat-Sessions.

**Architecture:** Go-Backend führt einen Agent-Loop gegen die OpenAI-kompatible Mistral-API aus (`stream: true` + `tools`), führt Tools (`search_notes`, `navigate_to`) serverseitig aus und streamt SSE-Events (`token`/`tool`/`navigate`/`done`/`error`) an das React-Frontend. Sessions/Nachrichten liegen in MySQL (goose-Migration + sqlc). Das Frontend konsumiert den Stream per `authFetch` + `ReadableStream` (wie `NotificationProvider`).

**Tech Stack:** Go (fiber v3, sqlc, goose, viper, google/uuid), MySQL, React 19 + react-router v7 (basename `/ui`), zustand, Tailwind v4, i18next, Mistral Chat Completions API.

**Spec:** `docs/superpowers/specs/2026-06-11-ai-chat-assistant-design.md`

**Wichtige Projektkonventionen (nicht verhandelbar):**
- DB-Zugriff NUR über sqlc (`api_go/data/sql/queries/query.sql` → `sqlc generate`), niemals handgeschriebene Query-Dateien in `api_go/db/`.
- Migrationen: 5-stellig nummeriert (`00024_...`), goose-Format mit `-- +goose Up/Down` und `StatementBegin/End`. Das Padding ist Pflicht — sonst bricht die sqlc-Generierung.
- FK-Spalten auf `user.id`: `VARCHAR(255)` + `COLLATE utf8mb4_general_ci` (sonst MySQL Error 3780).
- Tests: stdlib `testing` (kein testify), `httptest` für externe Services, `tests/` nutzt testcontainers (Docker nötig).
- Abweichung von der Spec (begründet): `role` ist `VARCHAR(16)` statt `ENUM` — sqlc/MySQL generiert dann schlicht `string`, das ist robuster und entspricht dem Stil von `club_events.event_type`.

---

### Task 1: DB-Migration & sqlc-Queries

**Files:**
- Create: `api_go/data/sql/migrations/00024_ai_chat.sql`
- Modify: `api_go/data/sql/queries/query.sql` (am Ende anhängen)
- Generated: `api_go/db/models.go`, `api_go/db/query.sql.go` (via `sqlc generate`)

- [ ] **Step 1: Migration anlegen**

`api_go/data/sql/migrations/00024_ai_chat.sql`:

```sql
-- +goose Up
-- +goose StatementBegin
CREATE TABLE ai_chat_session (
    id         VARCHAR(36)  NOT NULL,
    user_fk    VARCHAR(255) COLLATE utf8mb4_general_ci NOT NULL,
    title      VARCHAR(255) NOT NULL DEFAULT '',
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_ai_chat_session_user (user_fk, updated_at),
    CONSTRAINT fk_ai_chat_session_user FOREIGN KEY (user_fk) REFERENCES user (id) ON DELETE CASCADE
) COLLATE = utf8mb4_general_ci;
-- +goose StatementEnd
-- +goose StatementBegin
CREATE TABLE ai_chat_message (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    session_fk VARCHAR(36)  NOT NULL,
    role       VARCHAR(16)  NOT NULL,
    content    TEXT         NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_ai_chat_message_session (session_fk, created_at),
    CONSTRAINT fk_ai_chat_message_session FOREIGN KEY (session_fk) REFERENCES ai_chat_session (id) ON DELETE CASCADE
) COLLATE = utf8mb4_general_ci;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE ai_chat_message;
-- +goose StatementEnd
-- +goose StatementBegin
DROP TABLE ai_chat_session;
-- +goose StatementEnd
```

(Der Tabellenname `user` ist verifiziert — `00001_schema.sql:39`.)

- [ ] **Step 2: sqlc-Queries anhängen**

Am Ende von `api_go/data/sql/queries/query.sql`:

```sql
-- name: CreateAiChatSession :exec
INSERT INTO ai_chat_session (id, user_fk, title)
VALUES (?, ?, ?);

-- name: FindAiChatSessionsByUser :many
SELECT * FROM ai_chat_session
WHERE user_fk = ?
ORDER BY updated_at DESC;

-- name: FindAiChatSessionById :one
SELECT * FROM ai_chat_session
WHERE id = ?;

-- name: UpdateAiChatSessionTitle :exec
UPDATE ai_chat_session SET title = ? WHERE id = ?;

-- name: TouchAiChatSession :exec
UPDATE ai_chat_session SET updated_at = CURRENT_TIMESTAMP WHERE id = ?;

-- name: DeleteAiChatSession :exec
DELETE FROM ai_chat_session WHERE id = ?;

-- name: CreateAiChatMessage :exec
INSERT INTO ai_chat_message (session_fk, role, content)
VALUES (?, ?, ?);

-- name: FindAiChatMessagesBySession :many
SELECT * FROM ai_chat_message
WHERE session_fk = ?
ORDER BY created_at ASC, id ASC;
```

- [ ] **Step 3: Generieren und bauen**

```powershell
cd api_go
sqlc generate
go build ./...
```

Erwartet: kein Fehler. In `api_go/db/models.go` existieren jetzt `AiChatSession` (Felder `ID`, `UserFk`, `Title`, `CreatedAt`, `UpdatedAt`) und `AiChatMessage` (`ID int64`, `SessionFk`, `Role`, `Content`, `CreatedAt`); in `api_go/db/query.sql.go` die acht neuen Methoden.

- [ ] **Step 4: Commit**

```powershell
git add api_go/data/sql/migrations/00024_ai_chat.sql api_go/data/sql/queries/query.sql api_go/db/
git commit -m "feat: add ai chat session/message tables and sqlc queries"
```

---

### Task 2: AIChatService — Session-/Nachrichten-Verwaltung

Dünne sqlc-Wrapper; getestet werden sie über die Integrationstests in Task 4 (echte DB via testcontainers). Kein eigener Unit-Test, da keine Logik außer Ownership-Check und Titel-Kürzung.

**Files:**
- Create: `api_go/service/aiChatService.go`

- [ ] **Step 1: Service-Datei anlegen**

`api_go/service/aiChatService.go`:

```go
package service

import (
	"api_go/db"
	"api_go/models"
	"context"
	"errors"

	"github.com/google/uuid"
)

var ErrChatSessionNotFound = errors.New("chat session not found")

const sessionTitleMaxLen = 80
const maxHistoryMessages = 20

// NoteSearcher abstracts the note search so the agent loop can be
// unit-tested without a database. NoteService satisfies it.
type NoteSearcher interface {
	LoadAllNotes(userId string, page *int, nameStr *string) ([]models.Note, int, error)
}

// AIChatService owns chat sessions/messages and runs the function-calling
// agent loop (see aiChatAgent.go) against the configured AI provider.
type AIChatService struct {
	Queries    *db.Queries
	Ctx        context.Context
	AI         *AIService
	NoteSearch NoteSearcher
}

func (s *AIChatService) CreateSession(userID string) (db.AiChatSession, error) {
	id := uuid.NewString()
	err := s.Queries.CreateAiChatSession(s.Ctx, db.CreateAiChatSessionParams{
		ID:     id,
		UserFk: userID,
		Title:  "",
	})
	if err != nil {
		return db.AiChatSession{}, err
	}
	return s.Queries.FindAiChatSessionById(s.Ctx, id)
}

func (s *AIChatService) ListSessions(userID string) ([]db.AiChatSession, error) {
	return s.Queries.FindAiChatSessionsByUser(s.Ctx, userID)
}

// getOwnedSession returns the session only when it exists AND belongs to
// userID; both failure cases collapse into ErrChatSessionNotFound so the
// API never leaks whether a foreign session id exists.
func (s *AIChatService) getOwnedSession(userID, sessionID string) (db.AiChatSession, error) {
	sess, err := s.Queries.FindAiChatSessionById(s.Ctx, sessionID)
	if err != nil || sess.UserFk != userID {
		return db.AiChatSession{}, ErrChatSessionNotFound
	}
	return sess, nil
}

func (s *AIChatService) ListMessages(userID, sessionID string) ([]db.AiChatMessage, error) {
	if _, err := s.getOwnedSession(userID, sessionID); err != nil {
		return nil, err
	}
	return s.Queries.FindAiChatMessagesBySession(s.Ctx, sessionID)
}

func (s *AIChatService) DeleteSession(userID, sessionID string) error {
	if _, err := s.getOwnedSession(userID, sessionID); err != nil {
		return err
	}
	return s.Queries.DeleteAiChatSession(s.Ctx, sessionID)
}

// PrepareUserMessage validates ownership, persists the user message, sets
// the session title on first message and returns the history (last
// maxHistoryMessages, ending with the new user message) for the agent loop.
func (s *AIChatService) PrepareUserMessage(userID, sessionID, message string) ([]ChatMessage, error) {
	sess, err := s.getOwnedSession(userID, sessionID)
	if err != nil {
		return nil, err
	}
	err = s.Queries.CreateAiChatMessage(s.Ctx, db.CreateAiChatMessageParams{
		SessionFk: sessionID,
		Role:      "user",
		Content:   message,
	})
	if err != nil {
		return nil, err
	}
	if sess.Title == "" {
		title := message
		if runes := []rune(title); len(runes) > sessionTitleMaxLen {
			title = string(runes[:sessionTitleMaxLen])
		}
		_ = s.Queries.UpdateAiChatSessionTitle(s.Ctx, db.UpdateAiChatSessionTitleParams{
			Title: title,
			ID:    sessionID,
		})
	}
	_ = s.Queries.TouchAiChatSession(s.Ctx, sessionID)

	rows, err := s.Queries.FindAiChatMessagesBySession(s.Ctx, sessionID)
	if err != nil {
		return nil, err
	}
	if len(rows) > maxHistoryMessages {
		rows = rows[len(rows)-maxHistoryMessages:]
	}
	history := make([]ChatMessage, 0, len(rows))
	for _, r := range rows {
		history = append(history, ChatMessage{Role: r.Role, Content: r.Content})
	}
	return history, nil
}

func (s *AIChatService) PersistAssistantMessage(sessionID, content string) error {
	err := s.Queries.CreateAiChatMessage(s.Ctx, db.CreateAiChatMessageParams{
		SessionFk: sessionID,
		Role:      "assistant",
		Content:   content,
	})
	if err != nil {
		return err
	}
	return s.Queries.TouchAiChatSession(s.Ctx, sessionID)
}
```

`ChatMessage` wird in Task 3 (`aiChatAgent.go`) definiert — bis dahin kompiliert das Paket nicht; Task 2 und 3 daher in einem Schwung vor dem ersten `go build` abschließen oder Task 3 direkt anschließen.

- [ ] **Step 2: Noch NICHT committen** — Commit erfolgt zusammen mit Task 3, da `ChatMessage` dort definiert wird.

---

### Task 3: Agent-Loop mit Mistral Function Calling (TDD)

**Files:**
- Create: `api_go/service/aiChatAgent.go`
- Test: `api_go/service/aiChatAgent_test.go`

- [ ] **Step 1: Failing Test schreiben**

`api_go/service/aiChatAgent_test.go`:

```go
package service

import (
	"api_go/models"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

type stubNoteSearcher struct {
	notes []models.Note
}

func (s stubNoteSearcher) LoadAllNotes(userId string, page *int, nameStr *string) ([]models.Note, int, error) {
	return s.notes, len(s.notes), nil
}

func sseFrames(chunks ...string) string {
	var b strings.Builder
	for _, c := range chunks {
		b.WriteString("data: " + c + "\n\n")
	}
	b.WriteString("data: [DONE]\n\n")
	return b.String()
}

const toolCallChunk = `{"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"search_notes","arguments":"{\"query\":\"Kleine Nachtmusik\"}"}}]},"finish_reason":"tool_calls"}]}`

func newChatTestServer(t *testing.T, requestCount *int32, secondCallBody *string) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := atomic.AddInt32(requestCount, 1)
		body, _ := io.ReadAll(r.Body)
		w.Header().Set("Content-Type", "text/event-stream")
		if n == 1 {
			// First round: the model wants to call search_notes.
			_, _ = w.Write([]byte(sseFrames(toolCallChunk)))
			return
		}
		*secondCallBody = string(body)
		// Second round: the model streams its final answer.
		_, _ = w.Write([]byte(sseFrames(
			`{"choices":[{"delta":{"content":"Gefunden: "},"finish_reason":null}]}`,
			`{"choices":[{"delta":{"content":"Kleine Nachtmusik"},"finish_reason":"stop"}]}`,
		)))
	}))
}

func TestRunChat_ToolCallThenAnswer(t *testing.T) {
	var requestCount int32
	var secondCallBody string
	srv := newChatTestServer(t, &requestCount, &secondCallBody)
	defer srv.Close()

	svc := &AIChatService{
		AI: NewAIService(srv.URL, "tok", "test-model"),
		NoteSearch: stubNoteSearcher{notes: []models.Note{
			{Id: "abc-123", Name: "Kleine Nachtmusik", Author: models.Author{Name: "Mozart"}},
		}},
	}

	var events []ChatEvent
	final, err := svc.RunChat("user-1", []ChatMessage{{Role: "user", Content: "Such mir die Kleine Nachtmusik"}}, func(ev ChatEvent) {
		events = append(events, ev)
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if final != "Gefunden: Kleine Nachtmusik" {
		t.Errorf("unexpected final text: %q", final)
	}
	if requestCount != 2 {
		t.Errorf("expected 2 upstream calls, got %d", requestCount)
	}

	var sawTool, sawToken bool
	for _, ev := range events {
		if ev.Type == "tool" {
			sawTool = true
		}
		if ev.Type == "token" {
			sawToken = true
		}
	}
	if !sawTool || !sawToken {
		t.Errorf("expected tool and token events, got %+v", events)
	}

	// The second upstream call must contain the tool result message.
	if !strings.Contains(secondCallBody, `"role":"tool"`) || !strings.Contains(secondCallBody, "abc-123") {
		t.Errorf("second call missing tool result: %s", secondCallBody)
	}
}

func TestExecuteTool_NavigateWhitelist(t *testing.T) {
	svc := &AIChatService{}

	cases := []struct {
		path       string
		wantOK     bool
	}{
		{"/noteManagement/notes/abc-123", true},
		{"/clubs/1", false},
		{"https://evil.example.com", false},
		{"/noteManagement/notes/abc-123/../../../etc", false},
	}
	for _, tc := range cases {
		args, _ := json.Marshal(map[string]string{"path": tc.path})
		var navigated bool
		result := svc.executeTool("user-1", toolCall{
			ID:       "call_x",
			Type:     "function",
			Function: toolFunction{Name: "navigate_to", Arguments: string(args)},
		}, func(ev ChatEvent) {
			if ev.Type == "navigate" {
				navigated = true
			}
		})
		if navigated != tc.wantOK {
			t.Errorf("path %q: navigated=%v, want %v (result %s)", tc.path, navigated, tc.wantOK, result)
		}
	}
}
```

- [ ] **Step 2: Test laufen lassen — er muss fehlschlagen**

```powershell
cd api_go
go test ./service/ -run "TestRunChat_ToolCallThenAnswer|TestExecuteTool_NavigateWhitelist" -v
```

Erwartet: Compile-Fehler (`undefined: ChatEvent`, `undefined: ChatMessage`, …).

- [ ] **Step 3: Agent-Loop implementieren**

`api_go/service/aiChatAgent.go`:

```go
package service

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"sort"
	"strings"
)

// ChatEvent is one server-sent event pushed to the chat client while the
// agent loop runs. Type is one of: token, tool, navigate, done, error.
type ChatEvent struct {
	Type string
	Data map[string]any
}

// ChatMessage mirrors the OpenAI-compatible chat message shape used both
// for stored history (role user/assistant) and transient tool rounds.
type ChatMessage struct {
	Role       string     `json:"role"`
	Content    string     `json:"content"`
	ToolCalls  []toolCall `json:"tool_calls,omitempty"`
	ToolCallID string     `json:"tool_call_id,omitempty"`
	Name       string     `json:"name,omitempty"`
}

type toolCall struct {
	ID       string       `json:"id"`
	Type     string       `json:"type"`
	Function toolFunction `json:"function"`
}

type toolFunction struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

const maxAgentIterations = 5
const maxSearchResults = 10

var noteDetailPathRE = regexp.MustCompile(`^/noteManagement/notes/[A-Za-z0-9-]+$`)

const chatSystemPrompt = `Du bist der eingebaute Assistent von SmartOrganizr, einer Notenverwaltung für Musikvereine.
Dir stehen zwei Werkzeuge zur Verfügung:
- search_notes(query): durchsucht die Notensammlung des angemeldeten Users nach Titel.
- navigate_to(path): navigiert den Browser des Users zu einer Seite.
Regeln:
- Nutze für jede Suchanfrage search_notes. Erfinde niemals Treffer.
- Genau ein passender Treffer: rufe navigate_to mit "/noteManagement/notes/<id>" auf und bestätige in einem kurzen Satz.
- Mehrere Treffer: liste sie kurz auf (Titel, Komponist) und frage, welcher gemeint ist.
- Kein Treffer: sage das ehrlich.
- Antworte in der Sprache der letzten User-Nachricht. Antworte knapp.`

var chatTools = []map[string]any{
	{
		"type": "function",
		"function": map[string]any{
			"name":        "search_notes",
			"description": "Durchsucht die Musiknoten des angemeldeten Users nach einem Suchbegriff im Titel. Gibt maximal 10 Treffer zurück.",
			"parameters": map[string]any{
				"type": "object",
				"properties": map[string]any{
					"query": map[string]any{"type": "string", "description": "Suchbegriff, z.B. ein Werktitel"},
				},
				"required": []string{"query"},
			},
		},
	},
	{
		"type": "function",
		"function": map[string]any{
			"name":        "navigate_to",
			"description": "Navigiert den Browser des Users zu einer Seite in SmartOrganizr. Erlaubt sind ausschliesslich Noten-Detailseiten der Form /noteManagement/notes/<id>.",
			"parameters": map[string]any{
				"type": "object",
				"properties": map[string]any{
					"path": map[string]any{"type": "string", "description": "Pfad, z.B. /noteManagement/notes/abc-123"},
				},
				"required": []string{"path"},
			},
		},
	},
}

// RunChat executes the agent loop for one user turn. history must already
// end with the new user message. emit is called for every streamed event;
// the final assistant text is returned for persistence.
func (s *AIChatService) RunChat(userID string, history []ChatMessage, emit func(ChatEvent)) (string, error) {
	messages := append([]ChatMessage{{Role: "system", Content: chatSystemPrompt}}, history...)
	var finalText strings.Builder

	for i := 0; i < maxAgentIterations; i++ {
		text, calls, err := s.streamCompletion(messages, emit)
		if err != nil {
			return "", err
		}
		finalText.WriteString(text)
		if len(calls) == 0 {
			return finalText.String(), nil
		}
		messages = append(messages, ChatMessage{Role: "assistant", Content: text, ToolCalls: calls})
		for _, call := range calls {
			result := s.executeTool(userID, call, emit)
			messages = append(messages, ChatMessage{
				Role:       "tool",
				Content:    result,
				ToolCallID: call.ID,
				Name:       call.Function.Name,
			})
		}
	}
	return "", fmt.Errorf("agent loop exceeded %d iterations", maxAgentIterations)
}

type streamChunk struct {
	Choices []struct {
		Delta struct {
			Content   string `json:"content"`
			ToolCalls []struct {
				Index    int    `json:"index"`
				ID       string `json:"id"`
				Function struct {
					Name      string `json:"name"`
					Arguments string `json:"arguments"`
				} `json:"function"`
			} `json:"tool_calls"`
		} `json:"delta"`
		FinishReason *string `json:"finish_reason"`
	} `json:"choices"`
}

// streamCompletion performs one streaming chat/completions call. Text
// deltas are forwarded as token events; tool-call deltas are accumulated
// (providers may split the JSON arguments across chunks) and returned.
func (s *AIChatService) streamCompletion(messages []ChatMessage, emit func(ChatEvent)) (string, []toolCall, error) {
	payload := map[string]any{
		"model":       s.AI.Model,
		"messages":    messages,
		"tools":       chatTools,
		"tool_choice": "auto",
		"temperature": 0.2,
		"stream":      true,
	}
	buf, err := json.Marshal(payload)
	if err != nil {
		return "", nil, err
	}
	req, err := http.NewRequest("POST", s.AI.BaseURL+"/chat/completions", bytes.NewReader(buf))
	if err != nil {
		return "", nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.AI.Token)
	req.Header.Set("Accept", "text/event-stream")

	resp, err := s.AI.Client.Do(req)
	if err != nil {
		return "", nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("ai chat POST %s -> %d: %.500s", s.AI.BaseURL+"/chat/completions", resp.StatusCode, string(body))
		return "", nil, fmt.Errorf("AI provider returned %d", resp.StatusCode)
	}

	var text strings.Builder
	calls := map[int]*toolCall{}
	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		data := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if data == "[DONE]" {
			break
		}
		var chunk streamChunk
		if err := json.Unmarshal([]byte(data), &chunk); err != nil || len(chunk.Choices) == 0 {
			continue
		}
		delta := chunk.Choices[0].Delta
		if delta.Content != "" {
			text.WriteString(delta.Content)
			emit(ChatEvent{Type: "token", Data: map[string]any{"text": delta.Content}})
		}
		for _, tc := range delta.ToolCalls {
			existing, ok := calls[tc.Index]
			if !ok {
				existing = &toolCall{Type: "function"}
				calls[tc.Index] = existing
			}
			if tc.ID != "" {
				existing.ID = tc.ID
			}
			if tc.Function.Name != "" {
				existing.Function.Name = tc.Function.Name
			}
			existing.Function.Arguments += tc.Function.Arguments
		}
	}
	if err := scanner.Err(); err != nil {
		return "", nil, err
	}

	indexes := make([]int, 0, len(calls))
	for i := range calls {
		indexes = append(indexes, i)
	}
	sort.Ints(indexes)
	ordered := make([]toolCall, 0, len(calls))
	for _, i := range indexes {
		ordered = append(ordered, *calls[i])
	}
	return text.String(), ordered, nil
}

// executeTool runs one tool call and returns the JSON string handed back
// to the model as the tool result. Errors are reported to the model as
// JSON instead of aborting the loop.
func (s *AIChatService) executeTool(userID string, call toolCall, emit func(ChatEvent)) string {
	switch call.Function.Name {
	case "search_notes":
		var args struct {
			Query string `json:"query"`
		}
		if err := json.Unmarshal([]byte(call.Function.Arguments), &args); err != nil || strings.TrimSpace(args.Query) == "" {
			return `{"error":"invalid arguments, expected {\"query\": string}"}`
		}
		emit(ChatEvent{Type: "tool", Data: map[string]any{"status": args.Query}})
		notes, _, err := s.NoteSearch.LoadAllNotes(userID, nil, &args.Query)
		if err != nil {
			log.Printf("ai chat: search_notes failed: %v", err)
			return `{"error":"search failed"}`
		}
		type hit struct {
			ID       string `json:"id"`
			Title    string `json:"title"`
			Composer string `json:"composer,omitempty"`
			Folder   string `json:"folder,omitempty"`
		}
		hits := make([]hit, 0, maxSearchResults)
		for _, n := range notes {
			if len(hits) == maxSearchResults {
				break
			}
			h := hit{ID: n.Id, Title: n.Name, Composer: n.Author.Name}
			if n.Parent != nil {
				h.Folder = n.Parent.Name
			}
			hits = append(hits, h)
		}
		out, _ := json.Marshal(map[string]any{"results": hits, "total": len(notes)})
		return string(out)

	case "navigate_to":
		var args struct {
			Path string `json:"path"`
		}
		if err := json.Unmarshal([]byte(call.Function.Arguments), &args); err != nil || !noteDetailPathRE.MatchString(args.Path) {
			return `{"error":"path not allowed; only /noteManagement/notes/<id> is permitted"}`
		}
		emit(ChatEvent{Type: "navigate", Data: map[string]any{"path": args.Path}})
		return `{"ok":"navigation triggered"}`

	default:
		return `{"error":"unknown tool"}`
	}
}
```

(`models.Folder.Name` ist verifiziert — `api_go/models/Folder.go:8`.)

- [ ] **Step 4: Tests laufen lassen — sie müssen grün sein**

```powershell
cd api_go
go test ./service/ -run "TestRunChat_ToolCallThenAnswer|TestExecuteTool_NavigateWhitelist" -v
go build ./...
```

Erwartet: PASS, Build ok. Falls der `tool`-Status-Event-Check fehlschlägt: prüfen, dass `emit` vor dem `LoadAllNotes`-Aufruf passiert.

- [ ] **Step 5: Bestehende Service-Tests nicht kaputt gemacht?**

```powershell
go test ./service/ -v
```

Erwartet: alle PASS.

- [ ] **Step 6: Commit (Task 2 + 3 zusammen)**

```powershell
git add api_go/service/aiChatService.go api_go/service/aiChatAgent.go api_go/service/aiChatAgent_test.go
git commit -m "feat: ai chat service with mistral function-calling agent loop"
```

---

### Task 4: HTTP-Schicht — Konstanten, Controller, Routen, aiEnabled-Flag (Integrationstests zuerst)

**Files:**
- Test: `api_go/tests/aiChat_test.go` (zuerst!)
- Create: `api_go/controllers/aiChat.go`
- Modify: `api_go/constants/constants.go` (Konstante ergänzen)
- Modify: `api_go/controllers/dto/KeycloakModel.go` (Feld ergänzen)
- Modify: `api_go/routers/setupRouter.go` (Service-Instanz ~Zeile 151, SetLocal-Middleware ~Zeile 165–187, Keycloak-Middleware ~Zeile 189–196, Routen ~Zeile 310–312)

- [ ] **Step 1: Failing Integrationstests schreiben**

`api_go/tests/aiChat_test.go`:

```go
package tests

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"testing"
)

type aiChatSessionResponse struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	UpdatedAt string `json:"updatedAt"`
}

// Without SMARTORGANIZR_AI_TOKEN the whole chat API must 503.
func TestAiChatUnconfiguredReturns503(t *testing.T) {
	app := SetupTest(t)
	request, _ := http.NewRequest("GET", "http://localhost/api/v1/ai/chat/sessions", nil)
	response, err := app.Test(request)
	if err != nil {
		t.Fatalf("failed to make request: %v", err)
	}
	if response.StatusCode != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", response.StatusCode)
	}
}

func TestAiChatSessionCrud(t *testing.T) {
	t.Setenv("SMARTORGANIZR_AI_TOKEN", "test-token")
	app := SetupTest(t)

	// Create
	request, _ := http.NewRequest("POST", "http://localhost/api/v1/ai/chat/sessions", bytes.NewBufferString("{}"))
	request.Header.Set("Content-Type", "application/json")
	response, err := app.Test(request)
	if err != nil {
		t.Fatalf("failed to create session: %v", err)
	}
	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 on create, got %d", response.StatusCode)
	}
	body, _ := io.ReadAll(response.Body)
	var created aiChatSessionResponse
	if err := json.Unmarshal(body, &created); err != nil || created.ID == "" {
		t.Fatalf("invalid create response: %s (%v)", body, err)
	}

	// List contains the new session
	request, _ = http.NewRequest("GET", "http://localhost/api/v1/ai/chat/sessions", nil)
	response, _ = app.Test(request)
	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 on list, got %d", response.StatusCode)
	}
	body, _ = io.ReadAll(response.Body)
	var sessions []aiChatSessionResponse
	if err := json.Unmarshal(body, &sessions); err != nil {
		t.Fatalf("invalid list response: %s", body)
	}
	found := false
	for _, s := range sessions {
		if s.ID == created.ID {
			found = true
		}
	}
	if !found {
		t.Fatalf("created session %s not in list %s", created.ID, body)
	}

	// Empty messages list
	request, _ = http.NewRequest("GET", "http://localhost/api/v1/ai/chat/sessions/"+created.ID+"/messages", nil)
	response, _ = app.Test(request)
	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 on messages, got %d", response.StatusCode)
	}

	// Unknown session id -> 404
	request, _ = http.NewRequest("GET", "http://localhost/api/v1/ai/chat/sessions/does-not-exist/messages", nil)
	response, _ = app.Test(request)
	if response.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 for unknown session, got %d", response.StatusCode)
	}

	// Delete
	request, _ = http.NewRequest("DELETE", "http://localhost/api/v1/ai/chat/sessions/"+created.ID, nil)
	response, _ = app.Test(request)
	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 on delete, got %d", response.StatusCode)
	}
}
```

Hinweis: `t.Setenv` wirkt nur, wenn `SetupTest` die Config pro Test neu lädt (viper liest env beim Laden). Falls die Config global gecacht wird: in `tests/setup_utils.go` nachsehen, wie die Test-Config gebaut wird, und den AI-Token dort auf demselben Weg setzen wie andere Config-Werte.

- [ ] **Step 2: Tests laufen lassen — sie müssen fehlschlagen**

```powershell
cd api_go
go test ./tests/ -run "TestAiChat" -v
```

Erwartet: FAIL (404 statt 503/200, da Routen fehlen). Benötigt Docker (testcontainers).

- [ ] **Step 3: Konstante ergänzen**

In `api_go/constants/constants.go` neben `AIService` ergänzen:

```go
const AIChatService = "aiChatService"
```

- [ ] **Step 4: aiEnabled-Flag im Public-Config-DTO**

In `api_go/controllers/dto/KeycloakModel.go` dem Struct ein Feld hinzufügen:

```go
AiEnabled bool `json:"aiEnabled"`
```

- [ ] **Step 5: Controller schreiben**

`api_go/controllers/aiChat.go`:

```go
package controllers

import (
	"api_go/constants"
	"api_go/service"
	"bufio"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
)

type aiChatSessionDto struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type aiChatMessageDto struct {
	ID        int64     `json:"id"`
	Role      string    `json:"role"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"createdAt"`
}

type aiChatMessageRequest struct {
	Message string `json:"message"`
}

// configuredAiChat returns the chat service or nil when AI is not
// configured — callers must answer 503 on nil (same contract as
// PostIdentifyMusic).
func configuredAiChat(c fiber.Ctx) *service.AIChatService {
	svc := GetLocal[*service.AIChatService](c, constants.AIChatService)
	if svc == nil || svc.AI == nil || !svc.AI.IsConfigured() {
		return nil
	}
	return svc
}

func aiNotConfigured(c fiber.Ctx) error {
	return c.Status(503).JSON(fiber.Map{"error": "AI chat is not configured on this server"})
}

func GetAiChatSessions(c fiber.Ctx) error {
	svc := configuredAiChat(c)
	if svc == nil {
		return aiNotConfigured(c)
	}
	userID := GetLocal[string](c, "userId")
	sessions, err := svc.ListSessions(userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	out := make([]aiChatSessionDto, 0, len(sessions))
	for _, s := range sessions {
		out = append(out, aiChatSessionDto{ID: s.ID, Title: s.Title, UpdatedAt: s.UpdatedAt})
	}
	return c.JSON(out)
}

func PostAiChatSession(c fiber.Ctx) error {
	svc := configuredAiChat(c)
	if svc == nil {
		return aiNotConfigured(c)
	}
	userID := GetLocal[string](c, "userId")
	sess, err := svc.CreateSession(userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(aiChatSessionDto{ID: sess.ID, Title: sess.Title, UpdatedAt: sess.UpdatedAt})
}

func GetAiChatMessages(c fiber.Ctx) error {
	svc := configuredAiChat(c)
	if svc == nil {
		return aiNotConfigured(c)
	}
	userID := GetLocal[string](c, "userId")
	messages, err := svc.ListMessages(userID, c.Params("sessionId"))
	if errors.Is(err, service.ErrChatSessionNotFound) {
		return c.Status(404).JSON(fiber.Map{"error": "session not found"})
	}
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	out := make([]aiChatMessageDto, 0, len(messages))
	for _, m := range messages {
		out = append(out, aiChatMessageDto{ID: m.ID, Role: m.Role, Content: m.Content, CreatedAt: m.CreatedAt})
	}
	return c.JSON(out)
}

func DeleteAiChatSession(c fiber.Ctx) error {
	svc := configuredAiChat(c)
	if svc == nil {
		return aiNotConfigured(c)
	}
	userID := GetLocal[string](c, "userId")
	err := svc.DeleteSession(userID, c.Params("sessionId"))
	if errors.Is(err, service.ErrChatSessionNotFound) {
		return c.Status(404).JSON(fiber.Map{"error": "session not found"})
	}
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"ok": true})
}

func PostAiChatMessage(c fiber.Ctx) error {
	svc := configuredAiChat(c)
	if svc == nil {
		return aiNotConfigured(c)
	}
	userID := GetLocal[string](c, "userId")
	sessionID := c.Params("sessionId")

	var req aiChatMessageRequest
	if err := c.Bind().Body(&req); err != nil {
		return err
	}
	if strings.TrimSpace(req.Message) == "" {
		return c.Status(400).JSON(fiber.Map{"error": "message is required"})
	}

	// Persist + validate BEFORE switching to the stream so ownership and
	// DB errors still surface as proper HTTP status codes.
	history, err := svc.PrepareUserMessage(userID, sessionID, req.Message)
	if errors.Is(err, service.ErrChatSessionNotFound) {
		return c.Status(404).JSON(fiber.Map{"error": "session not found"})
	}
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")

	return c.SendStreamWriter(func(w *bufio.Writer) {
		emit := func(ev service.ChatEvent) {
			payload, err := json.Marshal(ev.Data)
			if err != nil {
				return
			}
			if _, err := w.WriteString("event: " + ev.Type + "\ndata: " + string(payload) + "\n\n"); err != nil {
				return
			}
			_ = w.Flush()
		}
		finalText, err := svc.RunChat(userID, history, emit)
		if err != nil {
			emit(service.ChatEvent{Type: "error", Data: map[string]any{"message": "AI request failed"}})
			return
		}
		if err := svc.PersistAssistantMessage(sessionID, finalText); err != nil {
			emit(service.ChatEvent{Type: "error", Data: map[string]any{"message": "failed to store reply"}})
			return
		}
		emit(service.ChatEvent{Type: "done", Data: map[string]any{}})
	})
}
```

- [ ] **Step 6: setupRouter.go verdrahten**

In `api_go/routers/setupRouter.go` — drei Stellen:

1. Nach der `aiService`-Instanziierung (~Zeile 151–155):

```go
var aiChatService = &service.AIChatService{
    Queries:    queries,
    Ctx:        context.Background(),
    AI:         aiService,
    NoteSearch: noteService,
}
```

2. Im SetLocal-Middleware-Block (~Zeile 165–187), neben den anderen Services:

```go
SetLocal[*service.AIChatService](c, constants.AIChatService, aiChatService)
```

3. In der Keycloak-Middleware (~Zeile 189–196) das neue Feld füllen:

```go
SetLocal[dto.KeycloakModel](c, "keycloak", dto.KeycloakModel{
    ClientId:  config.SSO.FrontendClientID,
    Url:       config.SSO.Url,
    Realm:     config.SSO.Realm,
    AiEnabled: aiService.IsConfigured(),
})
```

4. Die bestehende AI-Routengruppe (~Zeile 310–312) erweitern:

```go
profile.Route("v1/ai", func(r fiber.Router) {
    r.Post("/identify-music", controllers.PostIdentifyMusic)
    r.Get("/chat/sessions", controllers.GetAiChatSessions)
    r.Post("/chat/sessions", controllers.PostAiChatSession)
    r.Get("/chat/sessions/:sessionId/messages", controllers.GetAiChatMessages)
    r.Post("/chat/sessions/:sessionId/messages", controllers.PostAiChatMessage)
    r.Delete("/chat/sessions/:sessionId", controllers.DeleteAiChatSession)
})
```

- [ ] **Step 7: Tests laufen lassen — grün**

```powershell
cd api_go
go build ./...
go test ./tests/ -run "TestAiChat" -v
go test ./... 2>&1 | Select-Object -Last 20
```

Erwartet: Build ok, beide neuen Tests PASS, keine Regressionen.

- [ ] **Step 8: Commit**

```powershell
git add api_go/controllers/aiChat.go api_go/constants/constants.go api_go/controllers/dto/KeycloakModel.go api_go/routers/setupRouter.go api_go/tests/aiChat_test.go
git commit -m "feat: ai chat http endpoints with sse streaming and aiEnabled flag"
```

---

### Task 5: Frontend — Stream-Helper & Store

**Files:**
- Create: `ui/src/components/aichat/streamChat.ts`
- Create: `ui/src/store/aiChatStore.ts`

- [ ] **Step 1: Stream-Helper anlegen**

`ui/src/components/aichat/streamChat.ts` — Achtung: `authFetch` kommt aus `api/client.ts`, `apiURL` aber aus `Keycloak.ts` (`ui/src/Keycloak.ts:11`):

```ts
import { authFetch } from "../../api/client";
import { apiURL } from "../../Keycloak";

export type ChatStreamEvent =
    | { type: "token"; text: string }
    | { type: "tool"; status: string }
    | { type: "navigate"; path: string }
    | { type: "done" }
    | { type: "error"; message: string };

// POST + ReadableStream because EventSource cannot send a POST body or
// the Authorization header.
export async function streamChatMessage(
    sessionId: string,
    message: string,
    onEvent: (event: ChatStreamEvent) => void,
): Promise<void> {
    let response: Response;
    try {
        response = await authFetch(`${apiURL}/v1/ai/chat/sessions/${sessionId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
            body: JSON.stringify({ message }),
        });
    } catch {
        onEvent({ type: "error", message: "network" });
        return;
    }
    if (!response.ok || !response.body) {
        onEvent({ type: "error", message: `HTTP ${response.status}` });
        return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let terminal = false;

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sep = buffer.indexOf("\n\n");
        while (sep !== -1) {
            const frame = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            const lines = frame.split("\n");
            const eventLine = lines.find((l) => l.startsWith("event:"));
            const dataLine = lines.find((l) => l.startsWith("data:"));
            if (eventLine && dataLine) {
                const type = eventLine.slice("event:".length).trim();
                let data: Record<string, string> = {};
                try {
                    data = JSON.parse(dataLine.slice("data:".length).trim());
                } catch {
                    // ignore malformed frame
                }
                if (type === "done" || type === "error") terminal = true;
                onEvent({ type, ...data } as ChatStreamEvent);
            }
            sep = buffer.indexOf("\n\n");
        }
    }
    if (!terminal) {
        onEvent({ type: "error", message: "stream ended unexpectedly" });
    }
}
```

- [ ] **Step 2: Store anlegen**

`ui/src/store/aiChatStore.ts`:

```ts
import { create } from "zustand";

export interface AiChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    error?: boolean;
}

export interface AiChatSession {
    id: string;
    title: string;
    updatedAt: string;
}

interface AiChatState {
    isOpen: boolean;
    sessions: AiChatSession[];
    activeSessionId: string | null;
    messages: AiChatMessage[];
    streaming: boolean;
    toolStatus: string | null;
    setOpen: (open: boolean) => void;
    setSessions: (sessions: AiChatSession[]) => void;
    setActiveSession: (id: string | null, messages: AiChatMessage[]) => void;
    addMessage: (message: AiChatMessage) => void;
    appendToLastAssistant: (text: string) => void;
    markLastAssistantError: () => void;
    setStreaming: (streaming: boolean) => void;
    setToolStatus: (status: string | null) => void;
}

export const useAiChatStore = create<AiChatState>((set) => ({
    isOpen: false,
    sessions: [],
    activeSessionId: null,
    messages: [],
    streaming: false,
    toolStatus: null,
    setOpen: (isOpen) => set({ isOpen }),
    setSessions: (sessions) => set({ sessions }),
    setActiveSession: (activeSessionId, messages) =>
        set({ activeSessionId, messages, toolStatus: null }),
    addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
    appendToLastAssistant: (text) =>
        set((s) => {
            const messages = [...s.messages];
            const last = messages[messages.length - 1];
            if (last && last.role === "assistant") {
                messages[messages.length - 1] = { ...last, content: last.content + text };
            }
            return { messages };
        }),
    markLastAssistantError: () =>
        set((s) => {
            const messages = [...s.messages];
            const last = messages[messages.length - 1];
            if (last && last.role === "assistant") {
                messages[messages.length - 1] = { ...last, error: true };
            }
            return { messages };
        }),
    setStreaming: (streaming) => set({ streaming }),
    setToolStatus: (toolStatus) => set({ toolStatus }),
}));
```

- [ ] **Step 3: Typecheck**

```powershell
cd ui
npx tsc --noEmit
```

Erwartet: keine neuen Fehler (falls `tsc` im Projekt nicht direkt läuft: `npm run build` als Ersatz).

- [ ] **Step 4: Commit**

```powershell
git add ui/src/components/aichat/streamChat.ts ui/src/store/aiChatStore.ts
git commit -m "feat: ai chat stream helper and zustand store"
```

---

### Task 6: Frontend — Komponenten, Mount, Config-Flag, i18n

**Files:**
- Create: `ui/src/components/aichat/AIChatLauncher.tsx`
- Create: `ui/src/components/aichat/AIChatPanel.tsx`
- Modify: `ui/src/App.tsx` (RootLayout, Zeilen 29–43)
- Modify: `ui/src/index.tsx` (CachedKeycloakConfig + bootstrapApp, Zeilen 94, 105–124)
- Modify: `ui/src/language/json/de.json`, `ui/src/language/json/en.json`

- [ ] **Step 1: aiEnabled in den gecachten Public-Config aufnehmen**

In `ui/src/index.tsx`:

Zeile 94, Typ erweitern:

```ts
type CachedKeycloakConfig = { clientId: string; realm: string; url: string; aiEnabled?: boolean };
```

In `bootstrapApp` (Zeile ~111–115) das Feld mitnehmen:

```ts
config = {
    clientId: resp.data.clientId,
    realm: resp.data.realm,
    url: resp.data.url,
    aiEnabled: resp.data.aiEnabled === true,
};
```

- [ ] **Step 2: i18n-Keys ergänzen**

In `ui/src/language/json/de.json` (oberste Ebene, alphabetisch passend einsortieren):

```json
"aiChat": {
    "title": "Assistent",
    "newChat": "Neuer Chat",
    "deleteChat": "Chat löschen",
    "placeholder": "Frag mich z.B.: Such mir die Kleine Nachtmusik",
    "send": "Senden",
    "searching": "Suche nach „{{query}}“ …",
    "error": "Da ist etwas schiefgelaufen. Versuch es noch einmal.",
    "empty": "Womit kann ich helfen?",
    "open": "AI-Assistent öffnen",
    "close": "Schließen"
}
```

In `ui/src/language/json/en.json`:

```json
"aiChat": {
    "title": "Assistant",
    "newChat": "New chat",
    "deleteChat": "Delete chat",
    "placeholder": "Ask me e.g.: Find Eine kleine Nachtmusik",
    "send": "Send",
    "searching": "Searching for “{{query}}” …",
    "error": "Something went wrong. Please try again.",
    "empty": "How can I help?",
    "open": "Open AI assistant",
    "close": "Close"
}
```

- [ ] **Step 3: AIChatPanel bauen**

`ui/src/components/aichat/AIChatPanel.tsx` (Importe für `authFetch`/`apiURL` wie in Task 5):

```tsx
import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, Plus, SendHorizontal, Trash2, X } from "lucide-react";
import { authFetch } from "../../api/client";
import { apiURL } from "../../Keycloak";
import { AiChatMessage, AiChatSession, useAiChatStore } from "../../store/aiChatStore";
import { streamChatMessage } from "./streamChat";

export const AIChatPanel = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const {
        sessions, activeSessionId, messages, streaming, toolStatus,
        setOpen, setSessions, setActiveSession, addMessage,
        appendToLastAssistant, markLastAssistantError, setStreaming, setToolStatus,
    } = useAiChatStore();
    const [input, setInput] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);

    const refreshSessions = async () => {
        const resp = await authFetch(`${apiURL}/v1/ai/chat/sessions`);
        if (resp.ok) {
            setSessions((await resp.json()) as AiChatSession[]);
        }
    };

    useEffect(() => {
        refreshSessions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, toolStatus]);

    const openSession = async (sessionId: string) => {
        const resp = await authFetch(`${apiURL}/v1/ai/chat/sessions/${sessionId}/messages`);
        if (!resp.ok) return;
        const raw = (await resp.json()) as { id: number; role: "user" | "assistant"; content: string }[];
        setActiveSession(sessionId, raw.map((m) => ({ id: String(m.id), role: m.role, content: m.content })));
    };

    const deleteSession = async (sessionId: string) => {
        await authFetch(`${apiURL}/v1/ai/chat/sessions/${sessionId}`, { method: "DELETE" });
        if (sessionId === activeSessionId) {
            setActiveSession(null, []);
        }
        refreshSessions();
    };

    const sendMessage = async (e: FormEvent) => {
        e.preventDefault();
        const text = input.trim();
        if (!text || streaming) return;
        setInput("");

        let sessionId = activeSessionId;
        if (!sessionId) {
            const resp = await authFetch(`${apiURL}/v1/ai/chat/sessions`, { method: "POST" });
            if (!resp.ok) return;
            sessionId = ((await resp.json()) as AiChatSession).id;
            setActiveSession(sessionId, []);
        }

        addMessage({ id: crypto.randomUUID(), role: "user", content: text });
        addMessage({ id: crypto.randomUUID(), role: "assistant", content: "" });
        setStreaming(true);

        await streamChatMessage(sessionId, text, (event) => {
            switch (event.type) {
                case "token":
                    appendToLastAssistant(event.text);
                    break;
                case "tool":
                    setToolStatus(t("aiChat.searching", { query: event.status }));
                    break;
                case "navigate":
                    navigate(event.path);
                    break;
                case "done":
                    setToolStatus(null);
                    refreshSessions();
                    break;
                case "error":
                    setToolStatus(null);
                    markLastAssistantError();
                    appendToLastAssistant(t("aiChat.error"));
                    break;
            }
        });
        setStreaming(false);
    };

    return (
        <div className="flex h-[32rem] w-96 flex-col overflow-hidden rounded-lg bg-gray-700 text-white shadow-xl">
            <div className="flex items-center gap-2 border-b border-gray-600 p-3">
                <span className="flex-1 font-semibold">{t("aiChat.title")}</span>
                <button type="button" title={t("aiChat.newChat")}
                        onClick={() => setActiveSession(null, [])}>
                    <Plus className="h-5 w-5" />
                </button>
                <button type="button" title={t("aiChat.close")} onClick={() => setOpen(false)}>
                    <X className="h-5 w-5" />
                </button>
            </div>

            {sessions.length > 0 && (
                <div className="flex gap-1 overflow-x-auto border-b border-gray-600 p-2">
                    {sessions.map((s) => (
                        <div key={s.id}
                             className={`flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs ${
                                 s.id === activeSessionId ? "bg-gray-500" : "bg-gray-600"}`}>
                            <button type="button" className="max-w-40 truncate"
                                    onClick={() => openSession(s.id)}>
                                {s.title || t("aiChat.newChat")}
                            </button>
                            <button type="button" title={t("aiChat.deleteChat")}
                                    onClick={() => deleteSession(s.id)}>
                                <Trash2 className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {messages.length === 0 && (
                    <p className="text-sm text-gray-300">{t("aiChat.empty")}</p>
                )}
                {messages.map((m: AiChatMessage) => (
                    <div key={m.id}
                         className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                             m.role === "user"
                                 ? "ml-auto bg-blue-600"
                                 : m.error
                                     ? "bg-red-900"
                                     : "bg-gray-600"}`}>
                        {m.content}
                    </div>
                ))}
                {toolStatus && (
                    <p className="flex items-center gap-2 text-xs text-gray-300">
                        <Loader2 className="h-3 w-3 animate-spin" /> {toolStatus}
                    </p>
                )}
                <div ref={bottomRef} />
            </div>

            <form onSubmit={sendMessage} className="flex gap-2 border-t border-gray-600 p-3">
                <input
                    className="flex-1 rounded bg-gray-600 px-3 py-2 text-sm outline-none"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t("aiChat.placeholder")}
                    disabled={streaming}
                />
                <button type="submit" title={t("aiChat.send")} disabled={streaming || !input.trim()}>
                    {streaming ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizontal className="h-5 w-5" />}
                </button>
            </form>
        </div>
    );
};
```

Styling-Hinweis: Farben/Radien an die tatsächlich verwendeten Klassen der bestehenden Modals (`ui/src/components/modals/AddModal.tsx`) angleichen, falls dort andere Token (z.B. CSS-Variablen statt `bg-gray-700`) üblich sind.

- [ ] **Step 4: AIChatLauncher bauen**

`ui/src/components/aichat/AIChatLauncher.tsx`:

```tsx
import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAiChatStore } from "../../store/aiChatStore";
import { AIChatPanel } from "./AIChatPanel";

const KEYCLOAK_CONFIG_CACHE_KEY = "smartorganizr-keycloak-config";

function isAiEnabled(): boolean {
    try {
        const raw = localStorage.getItem(KEYCLOAK_CONFIG_CACHE_KEY);
        return raw ? JSON.parse(raw).aiEnabled === true : false;
    } catch {
        return false;
    }
}

export const AIChatLauncher = () => {
    const { t } = useTranslation();
    const { isOpen, setOpen } = useAiChatStore();

    if (!isAiEnabled()) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-40 hidden flex-col items-end gap-2 md:flex">
            {isOpen && <AIChatPanel />}
            {!isOpen && (
                <button
                    type="button"
                    title={t("aiChat.open")}
                    onClick={() => setOpen(true)}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-500"
                >
                    <MessageCircle className="h-6 w-6" />
                </button>
            )}
        </div>
    );
};
```

- [ ] **Step 5: In RootLayout mounten**

In `ui/src/App.tsx`, `RootLayout` (Zeilen 29–43) — `AIChatLauncher` importieren und als letztes Kind innerhalb des `NotificationProvider` rendern:

```tsx
import { AIChatLauncher } from "./components/aichat/AIChatLauncher";

function RootLayout() {
    return (
        <NotificationProvider>
            <div className="flex h-dvh flex-col overflow-hidden">
                <Header />
                <div className="flex min-h-0 flex-1">
                    <SideBar />
                    <main className="min-h-0 flex-1 overflow-auto">
                        <Outlet />
                    </main>
                </div>
            </div>
            <AIChatLauncher />
        </NotificationProvider>
    );
}
```

- [ ] **Step 6: Build prüfen**

```powershell
cd ui
npm run build
```

Erwartet: Build ohne Fehler.

- [ ] **Step 7: Commit**

```powershell
git add ui/src/components/aichat/ ui/src/App.tsx ui/src/index.tsx ui/src/language/json/de.json ui/src/language/json/en.json
git commit -m "feat: floating ai chat widget with streaming and navigation"
```

---

### Task 7: Ende-zu-Ende-Verifikation (manuell)

- [ ] **Step 1: Backend mit echter AI-Konfiguration starten**

`SMARTORGANIZR_AI_TOKEN` (Mistral-Key) und optional `SMARTORGANIZR_AI_MODEL` setzen. Wichtig: Das Chat-Feature braucht ein Modell mit Function-Calling-Support — `pixtral-12b-2409` (der Vision-Default) kann das; falls Antworten ohne Tool-Aufruf kommen, testweise `mistral-small-latest` setzen. Backend + UI starten (übliches Dev-Setup; goose-Migration läuft beim Start).

- [ ] **Step 2: Smoke-Test im Browser (Desktop-Breite)**

1. Login → unten rechts erscheint der runde Chat-Button (nur bei gesetztem AI-Token; ggf. einmal neu laden, damit `/public` mit `aiEnabled` neu gecacht wird).
2. Chat öffnen, „Such mir die Kleine Nachtmusik" senden (Note vorher anlegen).
3. Erwartet: Status „Suche nach …", dann gestreamter Antworttext, dann Navigation zur Noten-Detailseite `/noteManagement/notes/<id>`; Chat bleibt offen.
4. Mehrdeutige Suche (zwei ähnliche Titel): Assistent listet Treffer und fragt nach.
5. Reload → Session erscheint in der Session-Leiste, Verlauf lädt beim Anklicken.
6. „Neuer Chat" + Löschen-Icon funktionieren.
7. Browserfenster schmal ziehen (< md): Button verschwindet.
8. AI-Token entfernen, Backend neu starten, `/public` neu laden: Button erscheint nicht; `GET /api/v1/ai/chat/sessions` → 503.

- [ ] **Step 3: Komplette Testsuite**

```powershell
cd api_go
go test ./...
```

Erwartet: alles PASS.

- [ ] **Step 4: Abschluss**

Bei Abweichungen zwischen Spec und Implementierung (z.B. `role` als VARCHAR statt ENUM) die Spec `docs/superpowers/specs/2026-06-11-ai-chat-assistant-design.md` nachziehen und committen.
