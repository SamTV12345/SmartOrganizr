package dto

type PagedAuthorRepresentationModelList struct {
	Page     Page            `json:"page"`
	Links    map[string]Link `json:"_links"`
	Embedded struct {
		AuthorRepresentationModelList []Author `json:"authorRepresentationModelList"`
	} `json:"_embedded"`
}
