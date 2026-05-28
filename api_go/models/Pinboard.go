package models

import "time"

type PinboardPost struct {
	ID         string
	ClubID     string
	ClubName   string
	AuthorID   string
	AuthorName string
	Title      string
	Body       string
	Pinned     bool
	CreatedAt  time.Time
	UpdatedAt  time.Time
}
