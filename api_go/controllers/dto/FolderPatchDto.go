package dto

type FolderPatchDto struct {
	Description string `json:"description" validate:"required"`
	Name        string `json:"name"        validate:"required"`
	ParentId    string `json:"parentId"`
}
