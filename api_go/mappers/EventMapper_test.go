package mappers

import (
	"api_go/models"
	"testing"
)

func TestParseSummaryAndStatus(t *testing.T) {
	tests := []struct {
		name           string
		input          string
		wantSummary    string
		wantStatus     models.ConfirmStatus
	}{
		{
			name:        "ok prefix",
			input:       "(+) Konzert A",
			wantSummary: "Konzert A",
			wantStatus:  models.Ok,
		},
		{
			name:        "deny prefix",
			input:       "(-) Konzert B",
			wantSummary: "Konzert B",
			wantStatus:  models.Deny,
		},
		{
			name:        "maybe prefix",
			input:       "(?) Konzert C",
			wantSummary: "Konzert C",
			wantStatus:  models.Maybe,
		},
		{
			name:        "no prefix",
			input:       "Konzert D",
			wantSummary: "Konzert D",
			wantStatus:  models.NotYetDecided,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			gotSummary, gotStatus := parseSummaryAndStatus(tc.input)
			if gotSummary != tc.wantSummary {
				t.Fatalf("summary mismatch: got %q, want %q", gotSummary, tc.wantSummary)
			}
			if gotStatus != tc.wantStatus {
				t.Fatalf("status mismatch: got %v, want %v", gotStatus, tc.wantStatus)
			}
		})
	}
}
