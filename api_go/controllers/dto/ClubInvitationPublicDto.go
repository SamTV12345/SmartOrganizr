package dto

type ClubInvitationPublicDto struct {
	Token        string `json:"token"         validate:"required"`
	ClubID       string `json:"club_id"       validate:"required"`
	ClubName     string `json:"club_name"     validate:"required"`
	InvitedEmail string `json:"invited_email" validate:"required"`
	ExpiresAt    string `json:"expires_at"    validate:"required"`
	IsAccepted   bool   `json:"is_accepted"   validate:"required"`
	IsExpired    bool   `json:"is_expired"    validate:"required"`
}
