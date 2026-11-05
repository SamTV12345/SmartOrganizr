package tests

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v3"
)

type annotationPages struct {
	Key   string `json:"key"`
	Pages []struct {
		Page int    `json:"page"`
		Data string `json:"data"`
	} `json:"pages"`
}

func putAnnotation(t *testing.T, app *fiber.App, key string, page int, data string) *http.Response {
	t.Helper()
	body, _ := json.Marshal(map[string]any{"key": key, "page": page, "data": data})
	req, _ := http.NewRequest("PUT", "http://localhost/api/v1/annotations/page", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("put annotation: %v", err)
	}
	return res
}

func getAnnotations(t *testing.T, app *fiber.App, key string) annotationPages {
	t.Helper()
	res := doRequest(t, app, "GET", "http://localhost/api/v1/annotations?key="+url.QueryEscape(key))
	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode != http.StatusOK {
		t.Fatalf("get annotations: %d %s", res.StatusCode, string(raw))
	}
	var out annotationPages
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	return out
}

func TestSheetAnnotationsRoundTrip(t *testing.T) {
	app := SetupTest(t)
	key := "part:club-1:score-1:part-1"
	page2 := `{"strokes":[{"id":"s1","tool":"pen","points":[[0.1,0.2],[0.3,0.4]]}],"texts":[]}`

	if res := putAnnotation(t, app, key, 2, page2); res.StatusCode != http.StatusNoContent {
		t.Fatalf("put: expected 204, got %d", res.StatusCode)
	}
	if res := putAnnotation(t, app, key, 1, `{"strokes":[],"texts":[{"id":"t1","text":"zählen!"}]}`); res.StatusCode != http.StatusNoContent {
		t.Fatalf("put page 1: expected 204, got %d", res.StatusCode)
	}
	got := getAnnotations(t, app, key)
	if len(got.Pages) != 2 || got.Pages[0].Page != 1 || got.Pages[1].Data != page2 {
		t.Fatalf("unexpected %+v", got)
	}

	// Overwrite and clear.
	if res := putAnnotation(t, app, key, 2, `{"strokes":[],"texts":[]}`); res.StatusCode != http.StatusNoContent {
		t.Fatalf("clear: expected 204, got %d", res.StatusCode)
	}
	got = getAnnotations(t, app, key)
	if len(got.Pages) != 1 || got.Pages[0].Page != 1 {
		t.Fatalf("expected only page 1 left, got %+v", got)
	}

	// Other keys are separate.
	if other := getAnnotations(t, app, "note-xyz"); len(other.Pages) != 0 {
		t.Fatalf("unexpected pages for other key: %+v", other)
	}
}

func TestSheetAnnotationsValidation(t *testing.T) {
	app := SetupTest(t)
	cases := []struct {
		key  string
		page int
		data string
		want int
	}{
		{"", 1, `{}`, http.StatusBadRequest},
		{"note-1", 0, `{"strokes":[1]}`, http.StatusBadRequest},
		{"note-1", 1, `not json`, http.StatusBadRequest},
		{"note-1", 1, `[1,2]`, http.StatusBadRequest},
		{"note-1", 1, `{"strokes":["` + strings.Repeat("x", 600*1024) + `"]}`, http.StatusRequestEntityTooLarge},
	}
	for _, c := range cases {
		if res := putAnnotation(t, app, c.key, c.page, c.data); res.StatusCode != c.want {
			t.Errorf("key=%q page=%d: expected %d, got %d", c.key, c.page, c.want, res.StatusCode)
		}
	}
}
