package dto

type PinboardPostDto struct {
	ID         string `json:"id"`
	ClubID     string `json:"clubId"`
	ClubName   string `json:"clubName"`
	AuthorID   string `json:"authorId"`
	AuthorName string `json:"authorName"`
	Title      string `json:"title"`
	Body       string `json:"body"`
	Pinned     bool   `json:"pinned"`
	CreatedAt  string `json:"createdAt"`
	UpdatedAt  string `json:"updatedAt"`
}

type PinboardPostUpsertDto struct {
	Title  string `json:"title"`
	Body   string `json:"body"`
	Pinned bool   `json:"pinned"`
}
