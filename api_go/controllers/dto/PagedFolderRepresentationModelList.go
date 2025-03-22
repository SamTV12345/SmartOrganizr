package dto

type PagedFolderRepresentationModelList struct {
	Page     Page            `json:"page"`
	Links    map[string]Link `json:"_links"`
	Embedded struct {
		ElementRepresentationModelList []Folder `json:"elementRepresentationModelList"`
	} `json:"_embedded"`
}
