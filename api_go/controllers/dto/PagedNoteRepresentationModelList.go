package dto

type PagedNoteRepresentationModelList struct {
	Page     Page `json:"page"`
	Embedded struct {
		NoteRepresentationModelList []Note `json:"noteRepresentationModelList"`
	} `json:"_embedded"`
}
