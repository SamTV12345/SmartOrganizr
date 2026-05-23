package dto

type PagedAuthorRepresentationModelList struct {
	Page     Page `json:"page"`
	Embedded struct {
		AuthorRepresentationModelList []Author `json:"authorRepresentationModelList"`
	} `json:"_embedded"`
}
