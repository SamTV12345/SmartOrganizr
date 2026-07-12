package controllers

import (
	"api_go/constants"
	"api_go/controllers/dto"
	"api_go/service"
	"errors"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
)

func inventoryService(c fiber.Ctx) *service.InventoryService {
	svc := GetLocal[service.InventoryService](c, constants.InventoryService)
	return &svc
}

func mapInventoryError(err error) error {
	switch {
	case errors.Is(err, service.ErrInventoryNotFound):
		return fiber.NewError(fiber.StatusNotFound, err.Error())
	case errors.Is(err, service.ErrSweepCompleted):
		return fiber.NewError(fiber.StatusConflict, err.Error())
	default:
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
}

// PostInventoryIdentify godoc
// @Summary  Match a photographed first page against the user's notes
// @Tags     inventory
// @Accept   json
// @Produce  json
// @Param    body  body  dto.InventoryIdentifyRequest  true  "OCR text and optional image for the AI fallback"
// @Success  200   {array}  service.IdentifyCandidate
// @Router   /v1/inventory/identify [post]
func PostInventoryIdentify(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	var req dto.InventoryIdentifyRequest
	if err := c.Bind().Body(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	if i := strings.Index(req.ImageBase64, "base64,"); i >= 0 {
		req.ImageBase64 = req.ImageBase64[i+len("base64,"):]
	}
	candidates, err := inventoryService(c).Identify(userID, req.OcrText, req.ImageBase64, req.MimeType)
	if err != nil {
		return mapInventoryError(err)
	}
	return c.JSON(candidates)
}

// PostInventorySweep godoc
// @Summary  Start an inventory sweep for a folder (Mappe)
// @Tags     inventory
// @Accept   json
// @Produce  json
// @Param    body  body  dto.InventorySweepCreateRequest  true  "Folder to sweep"
// @Success  200   {object}  dto.InventorySweepCreatedResponse
// @Router   /v1/inventory/sweeps [post]
func PostInventorySweep(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	var req dto.InventorySweepCreateRequest
	if err := c.Bind().Body(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	id, err := inventoryService(c).CreateSweep(userID, req.FolderID)
	if err != nil {
		return mapInventoryError(err)
	}
	return c.JSON(dto.InventorySweepCreatedResponse{SweepID: id})
}

// PostInventorySighting godoc
// @Summary  Record a sighted note in a running sweep (assigns the inventory number)
// @Tags     inventory
// @Accept   json
// @Produce  json
// @Param    sweepId  path  string                        true  "Sweep ID"
// @Param    body     body  dto.InventorySightingRequest  true  "Sighting payload"
// @Success  200      {object}  service.SightingResult
// @Router   /v1/inventory/sweeps/{sweepId}/sightings [post]
func PostInventorySighting(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	var req dto.InventorySightingRequest
	if err := c.Bind().Body(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	result, err := inventoryService(c).AddSighting(userID, c.Params("sweepId"), req.NoteID, req.MatchedVia, req.Confidence, req.Incomplete)
	if err != nil {
		return mapInventoryError(err)
	}
	return c.JSON(result)
}

// PostInventorySweepComplete godoc
// @Summary  Complete a sweep and get the reconciliation report
// @Tags     inventory
// @Produce  json
// @Param    sweepId  path  string  true  "Sweep ID"
// @Success  200      {object}  service.SweepReport
// @Router   /v1/inventory/sweeps/{sweepId}/complete [post]
func PostInventorySweepComplete(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	report, err := inventoryService(c).CompleteSweep(userID, c.Params("sweepId"))
	if err != nil {
		return mapInventoryError(err)
	}
	return c.JSON(report)
}

// PostInventoryApplyMoves godoc
// @Summary  Move sighted notes into the swept folder
// @Tags     inventory
// @Accept   json
// @Param    sweepId  path  string                          true  "Sweep ID"
// @Param    body     body  dto.InventoryApplyMovesRequest  true  "Notes to move"
// @Success  204
// @Router   /v1/inventory/sweeps/{sweepId}/apply-moves [post]
func PostInventoryApplyMoves(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	var req dto.InventoryApplyMovesRequest
	if err := c.Bind().Body(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	if err := inventoryService(c).ApplyMoves(userID, c.Params("sweepId"), req.NoteIDs); err != nil {
		return mapInventoryError(err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// PutMappeTag godoc
// @Summary  Bind (or rotate) the NFC/QR tag of a folder
// @Tags     inventory
// @Produce  json
// @Param    folderId  path  string  true  "Folder ID"
// @Success  200       {object}  dto.MappeTagResponse
// @Router   /v1/inventory/folders/{folderId}/tag [put]
func PutMappeTag(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	tagID, err := inventoryService(c).BindTag(userID, c.Params("folderId"))
	if err != nil {
		return mapInventoryError(err)
	}
	baseURL := GetLocal[string](c, constants.AppBaseURL)
	return c.JSON(dto.MappeTagResponse{
		TagID: tagID,
		URL:   strings.TrimSuffix(baseURL, "/") + "/ui/inventory?tag=" + tagID,
	})
}

// GetMappeTag godoc
// @Summary  Resolve a scanned tag to its folder
// @Tags     inventory
// @Produce  json
// @Param    tagId  path  string  true  "Tag ID"
// @Success  200    {object}  service.ResolvedTag
// @Router   /v1/inventory/tags/{tagId} [get]
func GetMappeTag(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	resolved, err := inventoryService(c).ResolveTag(userID, c.Params("tagId"))
	if err != nil {
		return mapInventoryError(err)
	}
	return c.JSON(resolved)
}

// GetInventoryLookup godoc
// @Summary  Resolve a stamped inventory number (orphan page) to its piece and Mappe
// @Tags     inventory
// @Produce  json
// @Param    no  query  int  true  "Stamped inventory number"
// @Success  200  {object}  service.InventoryLookup
// @Router   /v1/inventory/lookup [get]
func GetInventoryLookup(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	no, err := strconv.Atoi(c.Query("no"))
	if err != nil || no <= 0 {
		return fiber.NewError(fiber.StatusBadRequest, "no must be a positive number")
	}
	result, err := inventoryService(c).Lookup(userID, int32(no))
	if err != nil {
		return mapInventoryError(err)
	}
	return c.JSON(result)
}

// PostInventoryNumber godoc
// @Summary  Assign the next free inventory number to a note (idempotent)
// @Tags     inventory
// @Produce  json
// @Param    noteId  path  string  true  "Note ID"
// @Success  200     {object}  map[string]int
// @Router   /v1/inventory/notes/{noteId}/number [post]
func PostInventoryNumber(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	no, err := inventoryService(c).AssignInventoryNo(userID, c.Params("noteId"))
	if err != nil {
		return mapInventoryError(err)
	}
	return c.JSON(fiber.Map{"inventoryNo": no})
}

// GetInventoryAttention godoc
// @Summary  Notes missing from or incomplete in their folder's latest completed sweep
// @Tags     inventory
// @Produce  json
// @Success  200  {object}  service.InventoryAttention
// @Router   /v1/inventory/attention [get]
func GetInventoryAttention(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	result, err := inventoryService(c).Attention(userID)
	if err != nil {
		return mapInventoryError(err)
	}
	return c.JSON(result)
}

// GetInventoryLastSeen godoc
// @Summary  Last completed-sweep sighting of a note
// @Tags     inventory
// @Produce  json
// @Param    noteId  path  string  true  "Note ID"
// @Success  200     {object}  service.InventoryLookup
// @Router   /v1/inventory/notes/{noteId}/last-seen [get]
func GetInventoryLastSeen(c fiber.Ctx) error {
	userID := GetLocal[string](c, "userId")
	result, err := inventoryService(c).LastSeen(userID, c.Params("noteId"))
	if err != nil {
		return mapInventoryError(err)
	}
	return c.JSON(result)
}
