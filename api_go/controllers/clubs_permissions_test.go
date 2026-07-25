package controllers

import (
	"api_go/models"
	"testing"
)

func TestBuildPermissionsDtoSections(t *testing.T) {
	// Only implemented sections may be advertised to the UI.
	want := map[string]bool{
		"pinnwand": true, "nachrichten": true, "dateien": true,
		"mitglieder": true, "rollen": true, "bearbeiten": true,
	}
	got := buildPermissionsDto(models.Admin, "", false).SectionWrite
	if len(got) != len(want) {
		t.Fatalf("SectionWrite has %d keys, want %d: %v", len(got), len(want), got)
	}
	for key := range want {
		if _, ok := got[key]; !ok {
			t.Fatalf("SectionWrite missing key %q", key)
		}
	}
}

func TestCanManageEvents(t *testing.T) {
	cases := map[models.ClubRole]bool{
		models.Admin:     true,
		models.CoAdmin:   true,
		models.Secretary: false,
		models.Treasurer: false,
		models.Member:    false,
	}
	for role, want := range cases {
		if got := canManageEvents(role); got != want {
			t.Fatalf("canManageEvents(%s) = %v, want %v", role, got, want)
		}
	}
}

func TestBuildPermissionsDtoSectionEventAuthority(t *testing.T) {
	// A Registerführer manages their own section's events without being a
	// club-wide event manager; a plain member of the same section does not.
	leader := buildPermissionsDto(models.Member, "flutes", true)
	if !leader.CanManageSectionEvents || leader.MySectionID != "flutes" {
		t.Fatalf("section leader: %+v", leader)
	}
	if leader.CanManageEvents {
		t.Fatalf("section leader must not be a club-wide event manager: %+v", leader)
	}

	plain := buildPermissionsDto(models.Member, "flutes", false)
	if plain.CanManageSectionEvents {
		t.Fatalf("plain member: %+v", plain)
	}

	// The flag needs a section to mean anything.
	sectionless := buildPermissionsDto(models.Member, "", true)
	if sectionless.CanManageSectionEvents {
		t.Fatalf("leader flag without a section must not grant authority: %+v", sectionless)
	}
}
