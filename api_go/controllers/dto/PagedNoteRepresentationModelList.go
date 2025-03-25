package dto

type PagedNoteRepresentationModelList struct {
	Page     Page            `json:"page"`
	Links    map[string]Link `json:"_links"`
	Embedded struct {
		NoteRepresentationModelList []Note `json:"noteRepresentationModelList"`
	} `json:"_embedded"`
}
