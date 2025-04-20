package builders

import (
	"api_go/controllers/dto"
	"github.com/go-faker/faker/v4"
)

func CreateParentFolderPostDto() dto.FolderPostDto {
	return dto.FolderPostDto{
		Name:        faker.Word(),
		Description: faker.Word(),
		ParentId:    nil,
	}
}

func CreateSubFolderPostDto(parent string) dto.FolderPostDto {
	return dto.FolderPostDto{
		Name:        faker.Word(),
		Description: faker.Word(),
		ParentId:    &parent,
	}
}
