package dto

import "time"

type ConcertPostDto struct {
	Title       string    `json:"title"       validate:"required"`
	Description string    `json:"description" validate:"required"`
	DueDate     time.Time `json:"dueDate"     validate:"required"`
	Location    string    `json:"location"    validate:"required"`
	Hints       string    `json:"hints"       validate:"required"`
}
