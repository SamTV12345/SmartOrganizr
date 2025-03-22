package mappers

import (
	"api_go/controllers/dto"
	"api_go/models"
)

func ConvertAuthorDtoFromModel(author models.Author) dto.Author {
	return dto.Author{
		ID:               author.ID,
		Name:             author.Name,
		ExtraInformation: author.ExtraInformation,
	}
}
