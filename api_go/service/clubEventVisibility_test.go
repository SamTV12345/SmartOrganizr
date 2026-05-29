package service

import "testing"

func TestVisibilityAllows(t *testing.T) {
	cases := []struct {
		token     string
		isManager bool
		want      bool
	}{
		{"all-members", false, true},
		{"all-members", true, true},
		{"leaders-and-authorized", false, false},
		{"leaders-and-authorized", true, true},
		{"only-authorized", false, false},
		{"only-authorized", true, true},
		{"all", false, true},   // legacy alias
		{"", false, true},      // legacy empty
		{"self", false, false},
		{"weird-unknown", false, false}, // fail safe: restrict
		{"weird-unknown", true, true},
	}
	for _, tc := range cases {
		if got := visibilityAllows(tc.token, tc.isManager); got != tc.want {
			t.Fatalf("visibilityAllows(%q, %v) = %v, want %v", tc.token, tc.isManager, got, tc.want)
		}
	}
}
