package dto

// ClubScoreDto is a piece in the club's sheet music archive (Notenarchiv).
type ClubScoreDto struct {
	ID        string             `json:"id"        validate:"required"`
	Title     string             `json:"title"     validate:"required"`
	Composer  *string            `json:"composer"`
	Arranger  *string            `json:"arranger"`
	PartCount int                `json:"partCount" validate:"required"`
	CreatedAt string             `json:"createdAt" validate:"required"`
	Parts     []ClubScorePartDto `json:"parts,omitempty"`
}

// ClubScorePartDto is one part (Stimme) of a score; the PDF is fetched separately.
type ClubScorePartDto struct {
	ID          string  `json:"id"        validate:"required"`
	ScoreID     string  `json:"scoreId"   validate:"required"`
	Name        string  `json:"name"      validate:"required"`
	SectionID   *string `json:"sectionId"`
	SectionName *string `json:"sectionName"`
	Position    int     `json:"position"  validate:"required"`
	SizeBytes   int64   `json:"sizeBytes" validate:"required"`
}

type ClubScorePostDto struct {
	Title    string  `json:"title" validate:"required"`
	Composer *string `json:"composer"`
	Arranger *string `json:"arranger"`
}

type ClubScorePartPatchDto struct {
	Name      string  `json:"name" validate:"required"`
	SectionID *string `json:"sectionId"`
}

type ClubScorePartChoiceDto struct {
	PartID string `json:"partId" validate:"required"`
}
