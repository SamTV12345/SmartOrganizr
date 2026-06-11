package service

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"time"
)

// chatStreamClient deliberately has no overall Timeout: http.Client.Timeout
// caps the whole exchange including the streamed body, which would kill
// long-running chats mid-stream. Cancellation comes from the request
// context (see RunChat); the dial/TLS phase still uses sane transport
// defaults.
var chatStreamClient = &http.Client{}

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
func (s *AIChatService) RunChat(ctx context.Context, userID string, history []ChatMessage, emit func(ChatEvent)) (string, error) {
	if s.AI == nil || !s.AI.IsConfigured() {
		return "", errors.New("AI chat is not configured")
	}

	ctx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()

	messages := append([]ChatMessage{{Role: "system", Content: chatSystemPrompt}}, history...)
	var finalText strings.Builder

	for i := 0; i < maxAgentIterations; i++ {
		text, calls, err := s.streamCompletion(ctx, messages, emit)
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
func (s *AIChatService) streamCompletion(ctx context.Context, messages []ChatMessage, emit func(ChatEvent)) (string, []toolCall, error) {
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
	req, err := http.NewRequestWithContext(ctx, "POST", s.AI.BaseURL+"/chat/completions", bytes.NewReader(buf))
	if err != nil {
		return "", nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.AI.Token)
	req.Header.Set("Accept", "text/event-stream")

	resp, err := chatStreamClient.Do(req)
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
