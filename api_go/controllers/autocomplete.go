package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/service"
	"sync"

	"github.com/gofiber/fiber/v3"
)

// GetWorksAutocomplete godoc
// @Summary  Autocomplete suggestions for works (local + Wikidata)
// @Tags     autocomplete
// @Produce  json
// @Param    q  query  string  true  "Search term (min 2 chars)"
// @Success  200  {object}  dto.AutocompleteWorksResponse
// @Router   /v1/autocomplete/works [get]
func GetWorksAutocomplete(c fiber.Ctx) error {
	q := c.Query("q")
	if len(q) < 2 {
		return c.JSON(dto.AutocompleteWorksResponse{
			Local:    []dto.AutocompleteWork{},
			External: []dto.AutocompleteWork{},
		})
	}
	userId := GetLocal[string](c, constants.UserId)
	noteService := GetLocal[service.NoteService](c, constants.NoteService)
	wd := GetLocal[*service.WikidataService](c, constants.WikidataService)

	var (
		local    []dto.AutocompleteWork
		external []dto.AutocompleteWork
		wg       sync.WaitGroup
	)
	wg.Add(2)
	go func() {
		defer wg.Done()
		local = noteService.AutocompleteLocalWorks(userId, q)
	}()
	go func() {
		defer wg.Done()
		external = []dto.AutocompleteWork{}
		results, err := wd.SearchWorks(q)
		if err != nil {
			return
		}
		for _, r := range results {
			w := dto.AutocompleteWork{
				WikidataID:      r.WikidataID,
				Name:            r.Name,
				Description:     r.Description,
				CompositionYear: r.Year,
				Genre:           r.Genre,
			}
			if r.Composer != nil {
				w.Composer = &dto.AutocompleteAuthor{
					WikidataID:  r.Composer.WikidataID,
					Name:        r.Composer.Name,
					Description: r.Composer.Description,
					BirthYear:   r.Composer.BirthYear,
					DeathYear:   r.Composer.DeathYear,
				}
			}
			external = append(external, w)
		}
	}()
	wg.Wait()

	return c.JSON(dto.AutocompleteWorksResponse{Local: local, External: external})
}

// GetAuthorsAutocomplete godoc
// @Summary  Autocomplete suggestions for authors (local + Wikidata)
// @Tags     autocomplete
// @Produce  json
// @Param    q  query  string  true  "Search term (min 2 chars)"
// @Success  200  {object}  dto.AutocompleteAuthorsResponse
// @Router   /v1/autocomplete/authors [get]
func GetAuthorsAutocomplete(c fiber.Ctx) error {
	q := c.Query("q")
	if len(q) < 2 {
		return c.JSON(dto.AutocompleteAuthorsResponse{
			Local:    []dto.AutocompleteAuthor{},
			External: []dto.AutocompleteAuthor{},
		})
	}
	userId := GetLocal[string](c, constants.UserId)
	authorService := GetLocal[service.AuthorService](c, constants.AuthorService)
	wd := GetLocal[*service.WikidataService](c, constants.WikidataService)

	var (
		local    []dto.AutocompleteAuthor
		external []dto.AutocompleteAuthor
		wg       sync.WaitGroup
	)
	wg.Add(2)
	go func() {
		defer wg.Done()
		local = authorService.AutocompleteLocalAuthors(userId, q)
	}()
	go func() {
		defer wg.Done()
		external = []dto.AutocompleteAuthor{}
		results, err := wd.SearchAuthors(q)
		if err != nil {
			return
		}
		for _, r := range results {
			external = append(external, dto.AutocompleteAuthor{
				WikidataID:  r.WikidataID,
				Name:        r.Name,
				Description: r.Description,
				BirthYear:   r.BirthYear,
				DeathYear:   r.DeathYear,
			})
		}
	}()
	wg.Wait()

	return c.JSON(dto.AutocompleteAuthorsResponse{Local: local, External: external})
}
