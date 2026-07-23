package dto

// ClubPollOptionDto is one answer option with its running result.
type ClubPollOptionDto struct {
	ID        string `json:"id"`
	Label     string `json:"label"`
	Position  int    `json:"position"`
	VoteCount int    `json:"voteCount"`
	VotedByMe bool   `json:"votedByMe"`
}

// ClubPollDto is a poll with its options, results and the caller's own votes.
type ClubPollDto struct {
	ID             string              `json:"id"`
	ClubID         string              `json:"clubId"`
	Question       string              `json:"question"`
	MultipleChoice bool                `json:"multipleChoice"`
	Closed         bool                `json:"closed"`
	ClosesAt       string              `json:"closesAt,omitempty"`
	CreatedAt      string              `json:"createdAt"`
	CreatedBy      string              `json:"createdByUserId"`
	TotalVotes     int                 `json:"totalVotes"`
	Options        []ClubPollOptionDto `json:"options"`
}

// ClubPollCreateDto is the manager's create payload.
type ClubPollCreateDto struct {
	Question       string   `json:"question" validate:"required"`
	Options        []string `json:"options" validate:"required"`
	MultipleChoice bool     `json:"multipleChoice"`
	ClosesAt       *string  `json:"closesAt"` // RFC3339 or null
}

// ClubPollVoteDto is a member's ballot. One option for single-choice polls,
// one or more for multiple-choice polls.
type ClubPollVoteDto struct {
	OptionIds []string `json:"optionIds" validate:"required"`
}
