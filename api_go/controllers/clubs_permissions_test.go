package controllers

import (
	"api_go/models"
	"testing"
)

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
