package service

import (
	"encoding/json"
	"testing"
)

func TestIsEmptyAnnotation(t *testing.T) {
	cases := map[string]bool{
		`{}`:                                  true,
		`{"strokes":[],"texts":[]}`:           true,
		`{"strokes":null}`:                    true,
		`{"strokes":[{"id":"a"}],"texts":[]}`: false,
		`{"texts":[{"text":"zählen"}]}`:       false,
		`{"v":1}`:                             false,
	}
	for in, want := range cases {
		var doc map[string]json.RawMessage
		if err := json.Unmarshal([]byte(in), &doc); err != nil {
			t.Fatalf("bad fixture %s: %v", in, err)
		}
		if got := IsEmptyAnnotation(doc); got != want {
			t.Errorf("IsEmptyAnnotation(%s) = %v, want %v", in, got, want)
		}
	}
}

func TestValidAnnotationKey(t *testing.T) {
	for key, want := range map[string]bool{
		"note-1":                  true,
		"part:club:score:part":    true,
		"":                        false,
		"with space":              false,
		string(make([]byte, 256)): false,
	} {
		if got := validAnnotationKey(key); got != want {
			t.Errorf("validAnnotationKey(%q) = %v, want %v", key, got, want)
		}
	}
}
