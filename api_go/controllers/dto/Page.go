package dto

type Page struct {
	Size          int `json:"size"          validate:"required"`
	Number        int `json:"number"        validate:"required"`
	TotalElements int `json:"totalElements" validate:"required"`
	TotalPages    int `json:"totalPages"    validate:"required"`
}
