package dto

type Page struct {
	Size          int `json:"size"`
	Number        int `json:"number"`
	TotalElements int `json:"totalElements"`
	TotalPages    int `json:"totalPages"`
}
