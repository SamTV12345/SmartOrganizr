package dto

type ClubInvitationPublicDto struct {
	Token        string `json:"token"`
	ClubID       string `json:"club_id"`
	ClubName     string `json:"club_name"`
	InvitedEmail string `json:"invited_email"`
	ExpiresAt    string `json:"expires_at"`
	IsAccepted   bool   `json:"is_accepted"`
	IsExpired    bool   `json:"is_expired"`
}

