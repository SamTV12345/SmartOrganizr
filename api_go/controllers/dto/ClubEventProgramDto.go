package dto

// ClubEventProgramEntryDto is one piece in an event's ordered program (setlist).
// NoteID is optional so a free-text piece (or one whose library note was deleted)
// still survives; Title is always the display text.
type ClubEventProgramEntryDto struct {
	ID              string  `json:"id"`
	NoteID          *string `json:"noteId"`
	Title           string  `json:"title" validate:"required"`
	Position        int     `json:"position"`
	DurationMinutes *int    `json:"durationMinutes"`
	NoteText        *string `json:"noteText"`
	// ScoreID links the entry to a piece in the club's sheet music archive.
	ScoreID *string `json:"scoreId"`
}

// ClubEventProgramReplaceDto is the whole-program upsert payload. The server
// replaces the event's program with these entries in the given order.
type ClubEventProgramReplaceDto struct {
	Entries []ClubEventProgramEntryDto `json:"entries"`
}

// ClubEventPlaylistItemDto is one program entry resolved against the
// requesting player's own library, so the play mode can open their PDF.
type ClubEventPlaylistItemDto struct {
	EntryID      string  `json:"entryId"      validate:"required"`
	Title        string  `json:"title"        validate:"required"`
	Position     int     `json:"position"     validate:"required"`
	NoteText     *string `json:"noteText"`
	NoteID       *string `json:"noteId"`
	PdfAvailable bool    `json:"pdfAvailable" validate:"required"`
	Match        string  `json:"match"        validate:"required" enums:"part,choosePart,own,wikidata,title,none"`
	// Set when the entry links a club score: the member's part (if any) and
	// every part of the score to switch to.
	ScoreID  *string                    `json:"scoreId"`
	PartID   *string                    `json:"partId"`
	PartName *string                    `json:"partName"`
	Parts    []ClubEventPlaylistPartDto `json:"parts,omitempty"`
}

type ClubEventPlaylistPartDto struct {
	ID         string `json:"id"         validate:"required"`
	Name       string `json:"name"       validate:"required"`
	OwnSection bool   `json:"ownSection" validate:"required"`
}
