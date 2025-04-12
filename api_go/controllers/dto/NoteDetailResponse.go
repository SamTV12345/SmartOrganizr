package dto

type NoteDetailResponse struct {
	CurrentNote  *Note `json:"currentNote"`
	PreviousNote *Note `json:"previousNote"`
	NextNote     *Note `json:"nextNote"`
	Index        int   `json:"index"`
}
