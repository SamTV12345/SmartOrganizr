package dto

import "time"

type ConcertPostDto struct {
	Title       string    `json:"title"`
	Description string    `json:"description"`
	DueDate     time.Time `json:"dueDate"`
	Location    string    `json:"location"`
	Hints       string    `json:"hints"`
}
