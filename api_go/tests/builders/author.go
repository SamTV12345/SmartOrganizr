package builders

import (
	"api_go/controllers/dto"

	"github.com/go-faker/faker/v4"
)

func CreateAuthorDto() dto.AuthorCreateDto {
	return dto.AuthorCreateDto{
		ExtraInformation: faker.Word(),
		Name:             faker.Word(),
	}
}

func CreateAuthorUpdateDto() dto.AuthorPatchDto {
	return dto.AuthorPatchDto{
		ExtraInformation: faker.Word(),
		Name:             faker.Word(),
	}
}
