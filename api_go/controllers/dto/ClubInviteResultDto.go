package dto

type ClubInviteResultDto struct {
	AddedEmails   []string `json:"added_emails"`
	InvitedEmails []string `json:"invited_emails"`
	FailedEmails  []string `json:"failed_emails"`
}
