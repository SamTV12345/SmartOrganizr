package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/mappers"
	"api_go/models"
	"api_go/service"

	"github.com/gofiber/fiber/v3"
)

// PostWorkFromWikidata godoc
// @Summary  Create a note (work) from a Wikidata entry
// @Tags     elements
// @Accept   json
// @Produce  json
// @Param    body  body  dto.WorkFromWikidataRequest  true  "Wikidata source + parent folder"
// @Success  200   {object}  dto.Note
// @Failure  409   {object}  dto.WorkFromWikidataConflictResponse
// @Failure  502   {object}  map[string]string
// @Router   /v1/works/from-wikidata [post]
func PostWorkFromWikidata(c fiber.Ctx) error {
	var req dto.WorkFromWikidataRequest
	if err := c.Bind().Body(&req); err != nil {
		return err
	}
	if req.WikidataID == "" || req.ParentID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "wikidataId and parentId are required"})
	}

	userId := GetLocal[string](c, constants.UserId)
	wd := GetLocal[*service.WikidataService](c, constants.WikidataService)
	authorService := GetLocal[service.AuthorService](c, constants.AuthorService)
	noteService := GetLocal[service.NoteService](c, constants.NoteService)

	work, err := wd.GetWorkDetail(req.WikidataID)
	if err != nil {
		return c.Status(502).JSON(fiber.Map{"error": "wikidata lookup failed: " + err.Error()})
	}

	var composer *models.Author
	if work.Composer != nil {
		resolved, resolveErr := resolveComposer(&authorService, userId, *work.Composer, req.ForceNewAuthor)
		if resolveErr != nil {
			return c.Status(500).JSON(fiber.Map{"error": resolveErr.Error()})
		}
		if resolved.conflict != nil {
			return c.Status(409).JSON(*resolved.conflict)
		}
		composer = resolved.author
	}

	note, err := noteService.CreateNoteFromWikidata(userId, req.ParentID, *work, composer)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(mappers.ConvertNoteDtoFromModel(&note, c))
}

type composerResolution struct {
	author   *models.Author
	conflict *dto.WorkFromWikidataConflictResponse
}

// resolveComposer wraps ResolveAuthor and handles the force-new-author bypass:
// when the caller has confirmed they want a separate author record (ForceNewAuthor=true)
// and we'd otherwise return a conflict, we create the new author anyway.
func resolveComposer(authorService *service.AuthorService, userId string, w service.WikidataAuthor, forceNew bool) (composerResolution, error) {
	resolver := service.NewSqlcAuthorResolver(authorService)
	res, err := service.ResolveAuthor(resolver, userId, w)
	if err != nil {
		return composerResolution{}, err
	}
	switch res.Status {
	case service.ResolveStatusMatched, service.ResolveStatusCreated:
		return composerResolution{author: &res.Author}, nil
	case service.ResolveStatusConflict:
		if !forceNew {
			conflict := &dto.WorkFromWikidataConflictResponse{
				Incoming:   wikidataAuthorToDTO(w),
				Candidates: authorsToAutocompleteDTOs(res.Candidates),
			}
			return composerResolution{conflict: conflict}, nil
		}
		// Force-create a separate author record alongside the existing same-name ones.
		created, createErr := authorService.CreateAuthor(dto.AuthorCreateDto{
			Name:       w.Name,
			WikidataID: w.WikidataID,
			BirthYear:  w.BirthYear,
			DeathYear:  w.DeathYear,
		}, userId)
		if createErr != nil {
			return composerResolution{}, createErr
		}
		return composerResolution{author: &created}, nil
	}
	return composerResolution{}, nil
}

func wikidataAuthorToDTO(w service.WikidataAuthor) dto.AutocompleteAuthor {
	return dto.AutocompleteAuthor{
		WikidataID:  w.WikidataID,
		Name:        w.Name,
		Description: w.Description,
		BirthYear:   w.BirthYear,
		DeathYear:   w.DeathYear,
	}
}

func authorsToAutocompleteDTOs(authors []models.Author) []dto.AutocompleteAuthor {
	out := make([]dto.AutocompleteAuthor, 0, len(authors))
	for _, a := range authors {
		out = append(out, dto.AutocompleteAuthor{
			ID:         a.ID,
			Name:       a.Name,
			WikidataID: a.WikidataID,
			BirthYear:  a.BirthYear,
			DeathYear:  a.DeathYear,
		})
	}
	return out
}
