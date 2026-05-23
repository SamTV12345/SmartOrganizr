package dto

type PagedNoteRepresentationModelList struct {
	Page     Page `json:"page" validate:"required"`
	Embedded struct {
		NoteRepresentationModelList []Note `json:"noteRepresentationModelList" validate:"required"`
	} `json:"_embedded" validate:"required"`
}
