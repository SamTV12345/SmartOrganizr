package dto

type PagedFolderRepresentationModelList struct {
	Page     Page `json:"page" validate:"required"`
	Embedded struct {
		ElementRepresentationModelList []Folder `json:"elementRepresentationModelList" validate:"required"`
	} `json:"_embedded" validate:"required"`
}
