package dto

type FolderPostDto struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	ParentId    *string `json:"parentId"`
}
