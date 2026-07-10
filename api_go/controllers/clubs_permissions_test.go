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
	got := buildPermissionsDto(models.Admin).SectionWrite
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
