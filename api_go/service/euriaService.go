package service

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
)

// EuriaService talks to Infomaniak's AI Tools (Euria), which exposes an
// OpenAI-compatible chat completions endpoint. Auth uses a static Bearer
// token created in the Infomaniak Manager; do not confuse it with the SSO
// client credentials. The first request lazily resolves the account's
// product_id via GET /1/ai when one isn't pre-configured.
type EuriaService struct {
	BaseURL   string
	Token     string
	Model     string
	Client    *http.Client

	productMu  sync.Mutex
	productID  string
}

func NewEuriaService(baseURL, token, productID, model string) *EuriaService {
	return &EuriaService{
		BaseURL:   strings.TrimRight(baseURL, "/"),
		Token:     token,
		Model:     model,
		productID: productID,
		Client:    &http.Client{Timeout: 60 * time.Second},
	}
}

// IsConfigured returns true when the service has the bare minimum (a token)
// to make API calls. Endpoints should 503 when this is false.
func (s *EuriaService) IsConfigured() bool {
	return s.Token != ""
}

// MusicIdentification is the structured response returned by IdentifyMusicFromImage.
// Fields are populated best-effort from the LLM's free-text JSON output;
// callers must treat them as user input (display + confirm, never trust).
type MusicIdentification struct {
	Title      string  `json:"title"`
	Composer   string  `json:"composer"`
	Arranger   string  `json:"arranger,omitempty"`
	Confidence float64 `json:"confidence"`
	Notes      string  `json:"notes,omitempty"`
}

const identifyMusicPrompt = `Du analysierst ein Foto eines Notenblatts, Noten-Covers oder Musik-Booklets.
Identifiziere den Werkstitel und den/die Komponist(en) bzw. Arrangeur(en).

Antworte ausschliesslich als JSON-Objekt mit dem Schema:
{
  "title": string,
  "composer": string,
  "arranger": string,
  "confidence": number zwischen 0 und 1,
  "notes": string mit optionalen Beobachtungen
}

Wenn du das Werk nicht eindeutig identifizieren kannst, setze confidence niedrig (z.B. 0.2).
Lass arranger leer wenn nicht erkennbar. Antworte ausschliesslich mit dem JSON, kein Markdown, kein Fliesstext drumherum.`

// IdentifyMusicFromImage sends a base64-encoded image plus an identification
// prompt to the configured vision model and parses the LLM response as a
// MusicIdentification. mimeType should be "image/jpeg" or "image/png".
func (s *EuriaService) IdentifyMusicFromImage(imageB64, mimeType string) (*MusicIdentification, error) {
	if !s.IsConfigured() {
		return nil, errors.New("euria service is not configured (INFOMANIAK_AI_TOKEN missing)")
	}
	productID, err := s.resolveProductID()
	if err != nil {
		return nil, fmt.Errorf("resolve product_id: %w", err)
	}

	mime := mimeType
	if mime == "" {
		mime = "image/jpeg"
	}

	// OpenAI vision message format: content is an array where each item is
	// either {type: "text", text: ...} or {type: "image_url", image_url: {url: ...}}.
	// Data URLs are the standard way to pass base64 inline.
	payload := map[string]any{
		"model": s.Model,
		"messages": []map[string]any{
			{
				"role": "user",
				"content": []map[string]any{
					{"type": "text", "text": identifyMusicPrompt},
					{"type": "image_url", "image_url": map[string]any{
						"url": "data:" + mime + ";base64," + imageB64,
					}},
				},
			},
		},
		"temperature": 0.1, // low — we want consistent JSON, not creativity
	}

	url := fmt.Sprintf("%s/2/ai/%s/openai/v1/chat/completions", s.BaseURL, productID)
	body, err := s.postJSON(url, payload)
	if err != nil {
		return nil, err
	}

	var parsed struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, fmt.Errorf("decode chat response: %w", err)
	}
	if len(parsed.Choices) == 0 || parsed.Choices[0].Message.Content == "" {
		return nil, fmt.Errorf("euria returned empty content")
	}
	return parseIdentificationJSON(parsed.Choices[0].Message.Content)
}

// parseIdentificationJSON is forgiving: the model sometimes wraps its JSON
// in markdown fences (```json ... ```) or prefixes a short sentence. We
// extract the first {...} block we can find and parse it.
func parseIdentificationJSON(raw string) (*MusicIdentification, error) {
	jsonBlock := extractJSONObject(raw)
	if jsonBlock == "" {
		return nil, fmt.Errorf("no JSON object found in model output: %q", raw)
	}
	var id MusicIdentification
	if err := json.Unmarshal([]byte(jsonBlock), &id); err != nil {
		return nil, fmt.Errorf("decode identification JSON: %w (raw: %q)", err, jsonBlock)
	}
	return &id, nil
}

func extractJSONObject(s string) string {
	start := strings.Index(s, "{")
	if start < 0 {
		return ""
	}
	depth := 0
	for i := start; i < len(s); i++ {
		switch s[i] {
		case '{':
			depth++
		case '}':
			depth--
			if depth == 0 {
				return s[start : i+1]
			}
		}
	}
	return ""
}

// resolveProductID returns the cached product_id when set, otherwise looks
// it up via GET /1/ai once and caches it for the lifetime of the service.
func (s *EuriaService) resolveProductID() (string, error) {
	s.productMu.Lock()
	defer s.productMu.Unlock()
	if s.productID != "" {
		return s.productID, nil
	}
	url := s.BaseURL + "/1/ai"
	body, err := s.getJSON(url)
	if err != nil {
		return "", err
	}
	// Response shape: {"result": "success", "data": [{"product_id": ..., ...}, ...]}
	var listed struct {
		Data []struct {
			ProductID int    `json:"product_id"`
			Name      string `json:"name"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &listed); err != nil {
		return "", fmt.Errorf("decode /1/ai: %w (body: %q)", err, string(body))
	}
	if len(listed.Data) == 0 {
		return "", fmt.Errorf("/1/ai returned no products — is the AI Tools service enabled on this account?")
	}
	s.productID = fmt.Sprintf("%d", listed.Data[0].ProductID)
	log.Printf("euria: resolved product_id=%s (%s)", s.productID, listed.Data[0].Name)
	return s.productID, nil
}

func (s *EuriaService) getJSON(url string) ([]byte, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	return s.doAuthed(req)
}

func (s *EuriaService) postJSON(url string, payload any) ([]byte, error) {
	buf, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequest("POST", url, bytes.NewReader(buf))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	return s.doAuthed(req)
}

func (s *EuriaService) doAuthed(req *http.Request) ([]byte, error) {
	req.Header.Set("Authorization", "Bearer "+s.Token)
	req.Header.Set("Accept", "application/json")
	resp, err := s.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		log.Printf("euria %s %s -> %d: %s", req.Method, req.URL.Path, resp.StatusCode, truncate(string(body), 500))
		return nil, fmt.Errorf("infomaniak AI %s %s returned %d", req.Method, req.URL.Path, resp.StatusCode)
	}
	return body, nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "...[truncated]"
}
