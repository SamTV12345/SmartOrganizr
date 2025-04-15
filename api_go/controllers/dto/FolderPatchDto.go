package dto

type FolderPatchDto struct {
	Description string `json:"description"`
	Name        string `json:"name"`
	ParentId    string `json:"parentId"`
}
