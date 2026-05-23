package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
)

func newPage(number, totalElements int) dto.Page {
	size := constants.CurrentPageSize
	totalPages := 0
	if size > 0 {
		totalPages = (totalElements + size - 1) / size
	}
	return dto.Page{
		Size:          size,
		Number:        number,
		TotalElements: totalElements,
		TotalPages:    totalPages,
	}
}
