package dto

import "time"

type ConcertDto struct {
	Id             string             `json:"id"             validate:"required"`
	Title          string             `json:"title"          validate:"required"`
	Description    string             `json:"description"    validate:"required"`
	DueDate        time.Time          `json:"dueDate"        validate:"required"`
	Location       string             `json:"location"       validate:"required"`
	Hints          string             `json:"hints"          validate:"required"`
	// NoteInConcerts is only populated on single-concert responses; the list
	// endpoint stays lean and omits it.
	NoteInConcerts []NoteInConcertDto `json:"noteInConcerts,omitempty"`
}

type NoteInConcertDto struct {
	NoteInConcert  Note  `json:"noteInConcert"   validate:"required"`
	PlaceInConcert int32 `json:"placeInConcert"  validate:"required"`
}
