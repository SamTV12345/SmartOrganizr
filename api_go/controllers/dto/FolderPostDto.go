package dto

type FolderPostDto struct {
	Name        string  `json:"name"        validate:"required"`
	Description string  `json:"description" validate:"required"`
	ParentId    *string `json:"parentId"`
}
