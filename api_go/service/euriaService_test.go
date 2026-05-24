package service

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestEuria_IsConfigured(t *testing.T) {
	if NewEuriaService("https://x", "", "1", "m").IsConfigured() {
		t.Error("expected IsConfigured=false when token is empty")
	}
	if !NewEuriaService("https://x", "tok", "1", "m").IsConfigured() {
		t.Error("expected IsConfigured=true when token is set")
	}
}

func TestEuria_ResolvesProductIDLazily(t *testing.T) {
	calls := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/1/ai":
			calls++
			w.Write([]byte(`{"data":[{"product_id":42,"name":"My AI"}]}`))
		case "/2/ai/42/openai/v1/chat/completions":
			w.Write([]byte(chatCompletionsBody(`{"title":"Test","composer":"X","arranger":"","confidence":0.9}`)))
		default:
			t.Errorf("unexpected path %s", r.URL.Path)
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	euria := NewEuriaService(srv.URL, "tok", "", "llama")
	_, err := euria.IdentifyMusicFromImage("dGVzdA==", "image/jpeg")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if calls != 1 {
		t.Errorf("expected exactly 1 /1/ai call (lazy + cached), got %d", calls)
	}
	// Second call: must NOT hit /1/ai again (cached).
	_, err = euria.IdentifyMusicFromImage("dGVzdA==", "image/jpeg")
	if err != nil {
		t.Fatalf("second call error: %v", err)
	}
	if calls != 1 {
		t.Errorf("expected product_id to be cached, but /1/ai called %d times", calls)
	}
}

func TestEuria_IdentifyMusic_ParsesPlainJSON(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(chatCompletionsBody(`{"title":"Armenian Dances","composer":"Alfred Reed","arranger":"","confidence":0.95}`)))
	}))
	defer srv.Close()

	euria := NewEuriaService(srv.URL, "tok", "42", "vision")
	id, err := euria.IdentifyMusicFromImage("dGVzdA==", "image/jpeg")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if id.Title != "Armenian Dances" || id.Composer != "Alfred Reed" || id.Confidence < 0.9 {
		t.Errorf("unexpected identification: %+v", id)
	}
}

func TestEuria_IdentifyMusic_ParsesJSONInMarkdownFence(t *testing.T) {
	wrapped := "Hier die Antwort:\n\n```json\n" + `{"title":"X","composer":"Y","confidence":0.5}` + "\n```\n"
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(chatCompletionsBody(wrapped)))
	}))
	defer srv.Close()

	euria := NewEuriaService(srv.URL, "tok", "42", "vision")
	id, err := euria.IdentifyMusicFromImage("dGVzdA==", "image/jpeg")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if id.Title != "X" || id.Composer != "Y" {
		t.Errorf("expected X/Y after fence stripping, got %+v", id)
	}
}

func TestEuria_IdentifyMusic_BadStatusBubblesUp(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(429)
		w.Write([]byte(`{"error":"rate limit"}`))
	}))
	defer srv.Close()

	euria := NewEuriaService(srv.URL, "tok", "42", "vision")
	_, err := euria.IdentifyMusicFromImage("dGVzdA==", "image/jpeg")
	if err == nil {
		t.Fatal("expected error on 429")
	}
}

func TestEuria_NotConfigured(t *testing.T) {
	euria := NewEuriaService("https://x", "", "", "vision")
	_, err := euria.IdentifyMusicFromImage("dGVzdA==", "image/jpeg")
	if err == nil {
		t.Fatal("expected error when token missing")
	}
	if !strings.Contains(err.Error(), "not configured") {
		t.Errorf("unexpected error message: %v", err)
	}
}

func TestEuria_SendsBearerAndBodyShape(t *testing.T) {
	var capturedBody []byte
	var capturedAuth string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedAuth = r.Header.Get("Authorization")
		capturedBody, _ = io.ReadAll(r.Body)
		w.Write([]byte(chatCompletionsBody(`{"title":"t","composer":"c","confidence":0.5}`)))
	}))
	defer srv.Close()

	euria := NewEuriaService(srv.URL, "my-token", "42", "test-model")
	_, _ = euria.IdentifyMusicFromImage("aGVsbG8=", "image/png")

	if capturedAuth != "Bearer my-token" {
		t.Errorf("expected Bearer my-token, got %q", capturedAuth)
	}
	var req map[string]any
	if err := json.Unmarshal(capturedBody, &req); err != nil {
		t.Fatalf("decode request body: %v", err)
	}
	if req["model"] != "test-model" {
		t.Errorf("model mismatch: %v", req["model"])
	}
	// Spot-check that the image_url with data: URL made it through.
	if !strings.Contains(string(capturedBody), "data:image/png;base64,aGVsbG8=") {
		t.Errorf("expected data: URL in body, got %s", string(capturedBody))
	}
}

// chatCompletionsBody wraps a content string into the OpenAI chat
// completions response envelope.
func chatCompletionsBody(content string) string {
	envelope := map[string]any{
		"choices": []map[string]any{
			{"message": map[string]any{"role": "assistant", "content": content}},
		},
	}
	b, _ := json.Marshal(envelope)
	return string(b)
}

// Compile-time check that fmt is used (silence import-cycle linters during refactor).
var _ = fmt.Sprintf
