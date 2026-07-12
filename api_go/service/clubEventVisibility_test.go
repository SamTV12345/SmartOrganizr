package service

import (
	"api_go/models"
	"testing"
)

func member(userID, sectionID string, authorized, sectionLeader bool) models.ClubMember {
	return models.ClubMember{
		User:          models.User{UserId: userID},
		Authorized:    authorized,
		SectionID:     sectionID,
		SectionLeader: sectionLeader,
	}
}

func TestRowVisible(t *testing.T) {
	plain := member("viewer", "", false, false)
	authorized := member("viewer", "", true, false)
	flute := member("row", "sec-flute", false, false)
	fluteLeader := member("viewer", "sec-flute", false, true)
	clarinetLeader := member("viewer", "sec-clarinet", false, true)
	fluteMember := member("viewer", "sec-flute", false, false)

	cases := []struct {
		name      string
		token     string
		isManager bool
		viewer    models.ClubMember
		row       models.ClubMember
		want      bool
	}{
		{"all-members member", "all-members", false, plain, flute, true},
		{"all-members manager", "all-members", true, plain, flute, true},
		{"legacy all", "all", false, plain, flute, true},
		{"legacy empty", "", false, plain, flute, true},

		// leaders-and-authorized: managers OR authorized members.
		{"l+a plain member", "leaders-and-authorized", false, plain, flute, false},
		{"l+a manager", "leaders-and-authorized", true, plain, flute, true},
		{"l+a authorized", "leaders-and-authorized", false, authorized, flute, true},

		// only-authorized is strictly the flag — a LEITER without it is excluded.
		{"only-auth plain", "only-authorized", false, plain, flute, false},
		{"only-auth manager", "only-authorized", true, plain, flute, false},
		{"only-auth authorized", "only-authorized", false, authorized, flute, true},

		{"managers token authorized", "managers", false, authorized, flute, false},
		{"managers token manager", "managers", true, plain, flute, true},

		// section: managers all; Registerführer only their own section.
		{"section manager", "section", true, plain, flute, true},
		{"section leader same section", "section", false, fluteLeader, flute, true},
		{"section leader other section", "section", false, clarinetLeader, flute, false},
		{"section member not leader", "section", false, fluteMember, flute, false},
		{"section leader without section row", "section", false, fluteLeader, member("row", "", false, false), false},

		{"self", "self", false, authorized, flute, false},
		{"unknown restricts", "weird-unknown", false, authorized, flute, false},
		{"unknown manager", "weird-unknown", true, plain, flute, true},
	}
	for _, tc := range cases {
		if got := rowVisible(tc.token, tc.isManager, tc.viewer, tc.row); got != tc.want {
			t.Fatalf("%s: rowVisible(%q, manager=%v) = %v, want %v", tc.name, tc.token, tc.isManager, got, tc.want)
		}
	}
}
