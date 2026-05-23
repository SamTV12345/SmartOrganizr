package dto

type BaseClubFields struct {
	Name                     string `json:"name"                          validate:"required"`
	ClubType                 string `json:"club_type"                     validate:"required"`
	Street                   string `json:"street"                        validate:"required"`
	HouseNumber              string `json:"house_number"                  validate:"required"`
	Location                 string `json:"location"                      validate:"required"`
	PostalCode               string `json:"postal_code"                   validate:"required"`
	Country                  string `json:"country"                       validate:"required"`
	DatesVisibleForAllMember bool   `json:"dates_visible_for_all_members" validate:"required"`
	MembersCanSendMessages   bool   `json:"members_can_send_messages"     validate:"required"`
	FeedbackVisibility       string `json:"feedback_visibility"           validate:"required"`
	ReasonVisibility         string `json:"reason_visibility"             validate:"required"`
	ConfirmedRepresentative  bool   `json:"confirmed_representative"      validate:"required"`
}

type ClubDto struct {
	BaseClubFields
	ID string `json:"id" validate:"required"`
}
