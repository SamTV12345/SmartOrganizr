package dto

type PagedAuthorRepresentationModelList struct {
	Page     Page `json:"page" validate:"required"`
	Embedded struct {
		AuthorRepresentationModelList []Author `json:"authorRepresentationModelList" validate:"required"`
	} `json:"_embedded" validate:"required"`
}
