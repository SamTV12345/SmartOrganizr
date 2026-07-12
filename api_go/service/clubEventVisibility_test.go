package service

import "testing"

func TestVisibilityAllows(t *testing.T) {
	cases := []struct {
		token        string
		isManager    bool
		isAuthorized bool
		want         bool
	}{
		{"all-members", false, false, true},
		{"all-members", true, false, true},
		// leaders-and-authorized: managers OR authorized members.
		{"leaders-and-authorized", false, false, false},
		{"leaders-and-authorized", true, false, true},
		{"leaders-and-authorized", false, true, true},
		// only-authorized is strictly the flag — a LEITER without it is excluded.
		{"only-authorized", false, false, false},
		{"only-authorized", true, false, false},
		{"only-authorized", false, true, true},
		{"only-authorized", true, true, true},
		{"managers", false, true, false}, // authorized flag doesn't unlock manager-only
		{"managers", true, false, true},
		{"all", false, false, true}, // legacy alias
		{"", false, false, true},    // legacy empty
		{"self", false, true, false},
		{"weird-unknown", false, true, false}, // fail safe: restrict
		{"weird-unknown", true, false, true},
	}
	for _, tc := range cases {
		if got := visibilityAllows(tc.token, tc.isManager, tc.isAuthorized); got != tc.want {
			t.Fatalf("visibilityAllows(%q, manager=%v, authorized=%v) = %v, want %v",
				tc.token, tc.isManager, tc.isAuthorized, got, tc.want)
		}
	}
}
