package service

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestAI_IsConfigured(t *testing.T) {
	if NewAIService("https://x", "", "m").IsConfigured() {
		t.Error("expected IsConfigured=false when token is empty")
	}
	if !NewAIService("https://x", "tok", "m").IsConfigured() {
		t.Error("expected IsConfigured=true when token is set")
	}
}

func TestAI_IdentifyMusic_ParsesPlainJSON(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/chat/completions" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		w.Write([]byte(chatCompletionsBody(`{"title":"Armenian Dances","composer":"Alfred Reed","arranger":"","confidence":0.95}`)))
	}))
	defer srv.Close()

	ai := NewAIService(srv.URL, "tok", "pixtral-12b-2409")
	id, err := ai.IdentifyMusicFromImage("dGVzdA==", "image/jpeg")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if id.Title != "Armenian Dances" || id.Composer != "Alfred Reed" || id.Confidence < 0.9 {
		t.Errorf("unexpected identification: %+v", id)
	}
}

func TestAI_IdentifyMusic_FlattensArrayComposerToFirstName(t *testing.T) {
	// Real-world Pixtral response when a medley has multiple composers.
	// We collapse to the first name so author dedup is reliable.
	content := `{"title":"A Tribute to Amy Winehouse","composer":["Amy Winehouse","Mark Ronson","Sean Payne"],"arranger":"Peter Kleine Schaars","confidence":0.98}`
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(chatCompletionsBody(content)))
	}))
	defer srv.Close()

	ai := NewAIService(srv.URL, "tok", "pixtral-12b-2409")
	id, err := ai.IdentifyMusicFromImage("dGVzdA==", "image/jpeg")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if id.Composer != "Amy Winehouse" {
		t.Errorf("expected single composer 'Amy Winehouse', got %q", id.Composer)
	}
	if id.Arranger != "Peter Kleine Schaars" {
		t.Errorf("expected arranger string preserved, got %q", id.Arranger)
	}
}

func TestNormalizePersonName(t *testing.T) {
	cases := map[string]string{
		"":                                                    "",
		"Wolfgang Amadeus Mozart":                             "Wolfgang Amadeus Mozart",
		"Amy Winehouse (You Know I'm No Good, Rehab)":         "Amy Winehouse",
		"Amy Winehouse / Mark Ronson":                         "Amy Winehouse",
		"Andersson, Ulvaeus":                                  "Andersson",
		"Lennon & McCartney":                                  "Lennon",
		"Bach und Söhne":                                      "Bach",
		"Sondheim; Bernstein":                                 "Sondheim",
		"Reed and Jenkins":                                    "Reed",
		"  Peter Kleine Schaars  ":                            "Peter Kleine Schaars",
		// Capitalization normalisation
		"JOHANNES BRAHMS":                                     "Johannes Brahms",
		"johannes brahms":                                     "Johannes Brahms",
		"DIE TOTEN HOSEN":                                     "Die Toten Hosen",
		"ABBA":                                                "Abba",
		"j.s. bach":                                           "J.S. Bach",
		"jean-baptiste lully":                                 "Jean-Baptiste Lully",
		"o'brien":                                             "O'Brien",
		"MÜLLER":                                              "Müller",
	}
	for in, want := range cases {
		if got := normalizePersonName(in); got != want {
			t.Errorf("normalizePersonName(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestAI_IdentifyMusic_RepairsExcelStyleQuotes(t *testing.T) {
	// Real-world Pixtral output that broke standard JSON parsing — it
	// used "" as escape inside the title string instead of \".
	content := "{\n  \"title\": \"GRAN FINALE - ATTO II dall'opera \"\"Aida\"\"\",\n  \"composer\": \"Giuseppe Verdi\",\n  \"arranger\": \"Franco Cesarini\",\n  \"confidence\": 0.95,\n  \"notes\": \"Aus der Oper Aida.\"\n}"
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(chatCompletionsBody(content)))
	}))
	defer srv.Close()

	ai := NewAIService(srv.URL, "tok", "pixtral-12b-2409")
	id, err := ai.IdentifyMusicFromImage("dGVzdA==", "image/jpeg")
	if err != nil {
		t.Fatalf("expected repair to succeed, got: %v", err)
	}
	if !strings.Contains(id.Title, "Aida") || strings.Contains(id.Title, `""`) {
		t.Errorf("expected repaired title with single Aida, got %q", id.Title)
	}
	if id.Composer != "Giuseppe Verdi" {
		t.Errorf("composer mismatch: %q", id.Composer)
	}
	if id.Arranger != "Franco Cesarini" {
		t.Errorf("arranger mismatch: %q", id.Arranger)
	}
}

func TestAI_IdentifyMusic_PreservesEmptyArrangerThroughRepair(t *testing.T) {
	// If repair runs, it must not destroy legitimate empty-string values.
	content := "{\n  \"title\": \"Foo \"\"X\"\"\",\n  \"composer\": \"Bach\",\n  \"arranger\": \"\",\n  \"confidence\": 0.9\n}"
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(chatCompletionsBody(content)))
	}))
	defer srv.Close()

	ai := NewAIService(srv.URL, "tok", "pixtral-12b-2409")
	id, err := ai.IdentifyMusicFromImage("dGVzdA==", "image/jpeg")
	if err != nil {
		t.Fatalf("expected repair to succeed, got: %v", err)
	}
	if id.Arranger != "" {
		t.Errorf("expected empty arranger preserved, got %q", id.Arranger)
	}
}

func TestAI_IdentifyMusic_ParsesJSONInMarkdownFence(t *testing.T) {
	wrapped := "Hier die Antwort:\n\n```json\n" + `{"title":"X","composer":"Y","confidence":0.5}` + "\n```\n"
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(chatCompletionsBody(wrapped)))
	}))
	defer srv.Close()

	ai := NewAIService(srv.URL, "tok", "pixtral-12b-2409")
	id, err := ai.IdentifyMusicFromImage("dGVzdA==", "image/jpeg")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if id.Title != "X" || id.Composer != "Y" {
		t.Errorf("expected X/Y after fence stripping, got %+v", id)
	}
}

func TestAI_IdentifyMusic_BadStatusBubblesUp(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(429)
		w.Write([]byte(`{"error":"rate limit"}`))
	}))
	defer srv.Close()

	ai := NewAIService(srv.URL, "tok", "pixtral-12b-2409")
	_, err := ai.IdentifyMusicFromImage("dGVzdA==", "image/jpeg")
	if err == nil {
		t.Fatal("expected error on 429")
	}
}

func TestAI_NotConfigured(t *testing.T) {
	ai := NewAIService("https://x", "", "pixtral-12b-2409")
	_, err := ai.IdentifyMusicFromImage("dGVzdA==", "image/jpeg")
	if err == nil {
		t.Fatal("expected error when token missing")
	}
	if !strings.Contains(err.Error(), "not configured") {
		t.Errorf("unexpected error message: %v", err)
	}
}

func TestAI_SendsBearerAndBodyShape(t *testing.T) {
	var capturedBody []byte
	var capturedAuth string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedAuth = r.Header.Get("Authorization")
		capturedBody, _ = io.ReadAll(r.Body)
		w.Write([]byte(chatCompletionsBody(`{"title":"t","composer":"c","confidence":0.5}`)))
	}))
	defer srv.Close()

	ai := NewAIService(srv.URL, "my-token", "pixtral-12b-2409")
	_, _ = ai.IdentifyMusicFromImage("aGVsbG8=", "image/png")

	if capturedAuth != "Bearer my-token" {
		t.Errorf("expected Bearer my-token, got %q", capturedAuth)
	}
	var req map[string]any
	if err := json.Unmarshal(capturedBody, &req); err != nil {
		t.Fatalf("decode request body: %v", err)
	}
	if req["model"] != "pixtral-12b-2409" {
		t.Errorf("model mismatch: %v", req["model"])
	}
	if !strings.Contains(string(capturedBody), "data:image/png;base64,aGVsbG8=") {
		t.Errorf("expected data: URL in body, got %s", string(capturedBody))
	}
}

func chatCompletionsBody(content string) string {
	envelope := map[string]any{
		"choices": []map[string]any{
			{"message": map[string]any{"role": "assistant", "content": content}},
		},
	}
	b, _ := json.Marshal(envelope)
	return string(b)
}
