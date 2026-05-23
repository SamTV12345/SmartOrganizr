package models

import "time"

type Concert struct {
	Id             string
	Title          string
	Description    string
	Hints          string
	DueDate        time.Time
	Location       string
	NoteInConcerts []NoteInConcert
}
