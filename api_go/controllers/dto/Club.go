package dto

type BaseClubFields struct {
	Name                     string `json:"name"`
	ClubType                 string `json:"club_type"`
	Street                   string `json:"street"`
	HouseNumber              string `json:"house_number"`
	Location                 string `json:"location"`
	PostalCode               string `json:"postal_code"`
	Country                  string `json:"country"`
	DatesVisibleForAllMember bool   `json:"dates_visible_for_all_members"`
	MembersCanSendMessages   bool   `json:"members_can_send_messages"`
	FeedbackVisibility       string `json:"feedback_visibility"`
	ReasonVisibility         string `json:"reason_visibility"`
	ConfirmedRepresentative  bool   `json:"confirmed_representative"`
}

type ClubDto struct {
	BaseClubFields
	ID string `json:"id"`
}
