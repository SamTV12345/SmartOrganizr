package dto

import "time"

type ConcertDto struct {
	Id             string    `json:"id"`
	Title          string    `json:"title"`
	Description    string    `json:"description"`
	DueDate        time.Time `json:"dueDate"`
	Location       string    `json:"location"`
	NoteInConcerts string    `json:"noteInConcerts"`
}
