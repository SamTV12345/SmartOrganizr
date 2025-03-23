package dto

type NotePostDto struct {
	AuthorId      string `json:"authorId"`
	Description   string `json:"description"`
	NumberOfPages int    `json:"numberOfPages"`
	ParentId      string `json:"parentId"`
	Title         string `json:"title"`
}
