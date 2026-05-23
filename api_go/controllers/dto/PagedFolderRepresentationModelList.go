package dto

type PagedFolderRepresentationModelList struct {
	Page     Page `json:"page"`
	Embedded struct {
		ElementRepresentationModelList []Folder `json:"elementRepresentationModelList"`
	} `json:"_embedded"`
}
