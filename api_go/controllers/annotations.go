package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/service"
	"errors"

	"github.com/gofiber/fiber/v3"
)

func annotationService(c fiber.Ctx) *service.AnnotationService {
	svc := GetLocal[service.AnnotationService](c, constants.AnnotationService)
	return &svc
}

func mapAnnotationError(err error) error {
	switch {
	case errors.Is(err, service.ErrAnnotationTooLarge):
		return fiber.NewError(fiber.StatusRequestEntityTooLarge, err.Error())
	case errors.Is(err, service.ErrAnnotationQuota):
		return fiber.NewError(fiber.StatusConflict, err.Error())
	case errors.Is(err, service.ErrAnnotationKey), errors.Is(err, service.ErrAnnotationPage), errors.Is(err, service.ErrAnnotationData):
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return fiber.NewError(fiber.StatusInternalServerError, err.Error())
}

// GetSheetAnnotations godoc
// @Summary  Get the caller's annotations for a PDF (all pages)
// @Tags     annotations
// @Produce  json
// @Param    key  query  string  true  "PDF key: note id or part:<club>:<score>:<part>"
// @Success  200  {object}  dto.SheetAnnotationsDto
// @Router   /v1/annotations [get]
func GetSheetAnnotations(c fiber.Ctx) error {
	out, err := annotationService(c).List(GetLocal[string](c, "userId"), c.Query("key"))
	if err != nil {
		return mapAnnotationError(err)
	}
	return c.JSON(out)
}

// PutSheetAnnotationPage godoc
// @Summary  Replace the caller's annotations on one page (empty document deletes them)
// @Tags     annotations
// @Accept   json
// @Param    body  body  dto.SheetAnnotationPutDto  true  "Page annotations"
// @Success  204
// @Router   /v1/annotations/page [put]
func PutSheetAnnotationPage(c fiber.Ctx) error {
	var body dto.SheetAnnotationPutDto
	if err := c.Bind().Body(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	if err := annotationService(c).SavePage(GetLocal[string](c, "userId"), body); err != nil {
		return mapAnnotationError(err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}
