package dto

type ClubInviteResultDto struct {
	AddedEmails   []string `json:"added_emails"   validate:"required"`
	InvitedEmails []string `json:"invited_emails" validate:"required"`
	FailedEmails  []string `json:"failed_emails"  validate:"required"`
}
