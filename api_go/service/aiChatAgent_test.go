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
		path   string
		wantOK bool
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
