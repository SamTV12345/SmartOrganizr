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
	"time"
)

// AIService talks to any OpenAI-compatible chat completions endpoint. Used
// for the photo-based music identification flow. Designed to work with
// Mistral La Plateforme (the default) but works equally with OpenAI, Groq,
// Ollama, vLLM, OpenRouter, Infomaniak AI Tools etc. — set BaseURL and
// Token accordingly.
//
// Required env vars (with Mistral defaults shown):
//   SMARTORGANIZR_AI_BASE_URL  = https://api.mistral.ai/v1
//   SMARTORGANIZR_AI_TOKEN     = <api_key from console.mistral.ai>
//   SMARTORGANIZR_AI_MODEL     = pixtral-12b-2409
type AIService struct {
	BaseURL string
	Token   string
	Model   string
	Client  *http.Client
}

func NewAIService(baseURL, token, model string) *AIService {
	return &AIService{
		BaseURL: strings.TrimRight(baseURL, "/"),
		Token:   token,
		Model:   model,
		Client:  &http.Client{Timeout: 60 * time.Second},
	}
}

// IsConfigured returns true when the service has the bare minimum (a token)
// to make API calls. Endpoints should 503 when this is false.
func (s *AIService) IsConfigured() bool {
	return s.Token != ""
}

// MusicIdentification is the structured response returned by
// IdentifyMusicFromImage. Fields are populated best-effort from the LLM's
// free-text JSON output; callers must treat them as user input.
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
func (s *AIService) IdentifyMusicFromImage(imageB64, mimeType string) (*MusicIdentification, error) {
	if !s.IsConfigured() {
		return nil, errors.New("AI service is not configured (SMARTORGANIZR_AI_TOKEN missing)")
	}
	mime := mimeType
	if mime == "" {
		mime = "image/jpeg"
	}
	// base64 inflates by ~4/3; approximate bytes back for the log.
	approxBytes := len(imageB64) * 3 / 4
	log.Printf("ai: IdentifyMusicFromImage model=%s mime=%s image~=%d bytes", s.Model, mime, approxBytes)
	started := time.Now()

	// OpenAI vision message format: content is an array of typed parts.
	// Mistral and most clones accept the same shape.
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

	body, err := s.postChatCompletions(payload)
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
		log.Printf("ai: empty content in response after %dms", time.Since(started).Milliseconds())
		return nil, fmt.Errorf("AI returned empty content")
	}
	rawContent := parsed.Choices[0].Message.Content
	log.Printf("ai: raw model output (%dms): %s", time.Since(started).Milliseconds(), truncate(rawContent, 400))

	id, err := parseIdentificationJSON(rawContent)
	if err != nil {
		log.Printf("ai: parse error: %v", err)
		return nil, err
	}
	log.Printf("ai: parsed identification title=%q composer=%q arranger=%q confidence=%.2f",
		id.Title, id.Composer, id.Arranger, id.Confidence)
	return id, nil
}

// parseIdentificationJSON is forgiving: the model sometimes wraps its JSON
// in markdown fences (```json ... ```) or prefixes a short sentence. We
// extract the first {...} block we can find and parse it.
//
// Vision models also occasionally return composer/arranger as an array
// (e.g. "A Tribute to Amy Winehouse" has 3 composers across 3 songs) —
// we flatten those into a "A / B / C" string so the downstream form
// fields don't choke.
func parseIdentificationJSON(raw string) (*MusicIdentification, error) {
	jsonBlock := extractJSONObject(raw)
	if jsonBlock == "" {
		return nil, fmt.Errorf("no JSON object found in model output: %q", raw)
	}

	var rmi struct {
		Title      string          `json:"title"`
		Composer   json.RawMessage `json:"composer"`
		Arranger   json.RawMessage `json:"arranger"`
		Confidence float64         `json:"confidence"`
		Notes      string          `json:"notes"`
	}
	if err := json.Unmarshal([]byte(jsonBlock), &rmi); err != nil {
		return nil, fmt.Errorf("decode identification JSON: %w (raw: %q)", err, jsonBlock)
	}
	return &MusicIdentification{
		Title:      rmi.Title,
		Composer:   flattenStringOrArray(rmi.Composer),
		Arranger:   flattenStringOrArray(rmi.Arranger),
		Confidence: rmi.Confidence,
		Notes:      rmi.Notes,
	}, nil
}

// flattenStringOrArray accepts a raw JSON value that should be a string but
// might be an array of strings (when the model couldn't decide on a single
// answer). Returns a single string with " / " between items. Anything else
// (numbers, objects, null) yields an empty string.
func flattenStringOrArray(raw json.RawMessage) string {
	if len(raw) == 0 {
		return ""
	}
	var s string
	if err := json.Unmarshal(raw, &s); err == nil {
		return s
	}
	var arr []string
	if err := json.Unmarshal(raw, &arr); err == nil {
		return strings.Join(arr, " / ")
	}
	return ""
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

func (s *AIService) postChatCompletions(payload any) ([]byte, error) {
	buf, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	url := s.BaseURL + "/chat/completions"
	req, err := http.NewRequest("POST", url, bytes.NewReader(buf))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.Token)
	req.Header.Set("Accept", "application/json")

	resp, err := s.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		log.Printf("ai POST %s -> %d: %s", url, resp.StatusCode, truncate(string(body), 500))
		return nil, fmt.Errorf("AI provider returned %d", resp.StatusCode)
	}
	return body, nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "...[truncated]"
}
