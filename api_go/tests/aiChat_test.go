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
