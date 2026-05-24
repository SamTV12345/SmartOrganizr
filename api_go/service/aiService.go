package service

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"
	"unicode"
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

const identifyMusicPrompt = `Du bist ein OCR-System für Notenblätter. Lies AUSSCHLIESSLICH den Text ab, der auf dem Foto sichtbar ist. Rate NICHT aus deinem Weltwissen.

Antworte ausschliesslich als JSON-Objekt:
{
  "title": string,
  "composer": string,
  "arranger": string,
  "confidence": number zwischen 0 und 1,
  "notes": string
}

REGELN (extrem wichtig):
- title: der Werktitel, GENAU wie auf dem Blatt gedruckt.
- composer: der Komponisten-/Urheber-Name, GENAU wie auf dem Blatt gedruckt (typisch oben rechts, manchmal unter dem Titel, mit Worten wie "von", "Musik:", "Music by", "Composed by"). NICHT raten wer das Stück geschrieben hat wenn der Name nicht draufsteht!
- arranger: der Arrangeur-/Bearbeiter-Name, GENAU wie gedruckt (typisch mit "arr.", "arrangiert von", "Arrangement:", "Bearbeitung:", "Satz:"). Leer lassen wenn nicht erkennbar.
- Wenn am Blatt KEIN Komponistenname gedruckt ist: composer leer lassen und confidence unter 0.3 setzen. Lieber leer als falsch.
- KEINE Klammern, KEINE Mehrfachnennungen, KEIN Komma — genau ein Name pro Feld.
- KEIN Array. composer/arranger sind IMMER einzelne strings.
- Bei mehreren Komponisten am Blatt: den prominentesten (grösste Schrift / zuerst genannten) nehmen.

Für confidence:
- 0.9+ : Titel UND Komponist klar lesbar am Blatt.
- 0.5-0.8 : Eines von beiden gut lesbar, das andere unsicher.
- < 0.3 : Nichts oder kaum was lesbar, oder du musstest raten.

Für notes:
- 1-3 Sätze auf Deutsch zum Werk-Hintergrund (Jahr, Album, Anlass) — NUR wenn du das Werk sicher anhand der GEDRUCKTEN Angaben (Titel + Komponist) identifizieren konntest.
- Bei niedriger confidence: notes leer lassen.
- Keine Spekulation, keine Erfindungen.

JSON-Formatierung:
- KEINE doppelten Anführungszeichen ("") als Escape — wenn ein Titel Anführungszeichen enthält ("Aida"), entweder \" verwenden oder die Anführungszeichen weglassen.
- Beispiel falsch: "dall'opera ""Aida"""
- Beispiel richtig: "dall'opera Aida"

Antworte ausschliesslich mit dem JSON, kein Markdown, kein Fliesstext drumherum.`

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
//
// And they sometimes use Excel-style doubled quotes ("") instead of \" to
// embed quotes inside strings — see repairLLMJSON.
func parseIdentificationJSON(raw string) (*MusicIdentification, error) {
	jsonBlock := extractJSONObject(raw)
	if jsonBlock == "" {
		return nil, fmt.Errorf("no JSON object found in model output: %q", raw)
	}

	rmi, err := tryParseRMI(jsonBlock)
	if err != nil {
		// Try a repaired version. Logging on success too so we know how
		// often the repair pass kicks in.
		repaired := repairLLMJSON(jsonBlock)
		if r2, err2 := tryParseRMI(repaired); err2 == nil {
			log.Printf("ai: parsed after repair (original error: %v)", err)
			rmi = r2
		} else {
			return nil, fmt.Errorf("decode identification JSON: %w (raw: %q)", err, jsonBlock)
		}
	}

	return &MusicIdentification{
		Title:      rmi.Title,
		Composer:   normalizePersonName(flattenStringOrArray(rmi.Composer)),
		Arranger:   normalizePersonName(flattenStringOrArray(rmi.Arranger)),
		Confidence: rmi.Confidence,
		Notes:      rmi.Notes,
	}, nil
}

type rawMusicID struct {
	Title      string          `json:"title"`
	Composer   json.RawMessage `json:"composer"`
	Arranger   json.RawMessage `json:"arranger"`
	Confidence float64         `json:"confidence"`
	Notes      string          `json:"notes"`
}

func tryParseRMI(s string) (rawMusicID, error) {
	var r rawMusicID
	err := json.Unmarshal([]byte(s), &r)
	return r, err
}

// repairLLMJSON fixes the two non-JSON patterns we've seen in the wild:
//
//  1. Excel-style doubled-quote escaping — "dall'opera ""Aida"""
//     becomes "dall'opera 'Aida'" (we substitute single quotes since they
//     don't need escaping in JSON strings).
//
// Care is taken not to clobber genuine empty-string values (`: ""`).
func repairLLMJSON(s string) string {
	// Stash empty-string values behind a sentinel so the Excel-quote
	// substitution doesn't touch them.
	emptyValRE := regexp.MustCompile(`:\s*""`)
	const sentinel = "\x00__EMPTY_STRING_VALUE__\x00"
	s = emptyValRE.ReplaceAllString(s, ": "+sentinel)

	// Now every remaining "" is the model's Excel-style escape — collapse
	// pairs into single quotes which are valid inside JSON strings.
	s = strings.ReplaceAll(s, `""`, `'`)

	// Restore empty-string values.
	s = strings.ReplaceAll(s, sentinel, `""`)
	return s
}

// normalizePersonName turns a possibly-decorated composer/arranger string
// into a single clean name suitable for author dedup. The model sometimes
// ignores the prompt and writes things like:
//
//   "Amy Winehouse (You Know I'm No Good, Rehab)"
//   "Andersson, Ulvaeus"
//   "Amy Winehouse / Mark Ronson"
//   "JOHANNES BRAHMS"
//
// We want just "Amy Winehouse" — the first name token, parentheses stripped,
// title-cased. Everything past the first separator gets dropped (the user
// can recover detail from the AI 'notes' field if needed).
func normalizePersonName(name string) string {
	if name == "" {
		return ""
	}
	// Strip anything in parentheses (and the parens themselves).
	if i := strings.Index(name, "("); i >= 0 {
		name = name[:i]
	}
	// Take only the first name on common separators.
	for _, sep := range []string{" / ", ";", " & ", " und ", " and ", ","} {
		if i := strings.Index(name, sep); i >= 0 {
			name = name[:i]
			break
		}
	}
	return titleCaseName(strings.TrimSpace(name))
}

// titleCaseName normalises capitalisation: first letter of each word
// upper, rest lower. Handles hyphens, apostrophes, dots and other
// separators by capitalising the letter immediately after them too —
// so "j.s. bach" becomes "J.S. Bach" and "JEAN-BAPTISTE" becomes
// "Jean-Baptiste". Unicode-aware: "MÜLLER" -> "Müller".
//
// Note: this lower-cases everything that isn't the first letter of a
// run, which means "ABBA" -> "Abba". The user asked for that explicitly.
func titleCaseName(s string) string {
	if s == "" {
		return ""
	}
	var b strings.Builder
	b.Grow(len(s))
	capitalizeNext := true
	for _, r := range s {
		if unicode.IsLetter(r) {
			if capitalizeNext {
				b.WriteRune(unicode.ToUpper(r))
				capitalizeNext = false
			} else {
				b.WriteRune(unicode.ToLower(r))
			}
		} else {
			b.WriteRune(r)
			capitalizeNext = true
		}
	}
	return b.String()
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
