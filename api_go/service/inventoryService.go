package service

import (
	"api_go/db"
	"context"
	"database/sql"
	"errors"
	"sort"
	"strings"

	"github.com/google/uuid"
)

// InventoryService reconciles which physical Mappe (folder) each sheet lives
// in via photo sweeps, and manages stampable per-piece inventory numbers.
// See docs/superpowers/specs/2026-07-12-inventory-sweep-design.md.
type InventoryService struct {
	queries *db.Queries
	ctx     context.Context
	ai      *AIService
}

func NewInventoryService(queries *db.Queries, ai *AIService) InventoryService {
	return InventoryService{queries: queries, ctx: context.Background(), ai: ai}
}

var ErrInventoryNotFound = errors.New("not found")
var ErrInventoryForbidden = errors.New("not owner")
var ErrSweepCompleted = errors.New("sweep already completed")

/* ------------------------- text matching ------------------------- */

// partTokens are instrument/part words printed on sheets that carry no
// identity — stripped from both sides before scoring so "Flöte 1" on the
// photo doesn't drag down the match against the plain work title.
var partTokens = map[string]bool{
	"flöte": true, "floete": true, "oboe": true, "klarinette": true, "fagott": true,
	"saxophon": true, "trompete": true, "flügelhorn": true, "fluegelhorn": true,
	"horn": true, "posaune": true, "tenorhorn": true, "bariton": true, "euphonium": true,
	"tuba": true, "schlagzeug": true, "percussion": true, "pauken": true,
	"partitur": true, "direktion": true, "stimme": true, "score": true, "part": true,
	"in": true, "es": true, "b": true, "c": true, "f": true,
	"1": true, "2": true, "3": true, "4": true, "i": true, "ii": true, "iii": true,
}

// normalizeSheetTokens lowercases, strips punctuation and part tokens, and
// returns the remaining words.
func normalizeSheetTokens(s string) []string {
	var b strings.Builder
	for _, r := range strings.ToLower(s) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == 'ä' || r == 'ö' || r == 'ü' || r == 'ß' {
			b.WriteRune(r)
		} else {
			b.WriteRune(' ')
		}
	}
	var tokens []string
	for _, tok := range strings.Fields(b.String()) {
		if !partTokens[tok] {
			tokens = append(tokens, tok)
		}
	}
	return tokens
}

// tokenMatches reports whether a name token appears in the OCR tokens,
// tolerating one edit for words of five or more characters (OCR noise like
// "armen1an").
func tokenMatches(nameTok string, ocrTokens []string) bool {
	for _, ocrTok := range ocrTokens {
		if ocrTok == nameTok {
			return true
		}
		if len(nameTok) >= 5 && levenshteinAtMostOne(nameTok, ocrTok) {
			return true
		}
	}
	return false
}

// levenshteinAtMostOne reports whether a and b are within edit distance 1.
func levenshteinAtMostOne(a, b string) bool {
	la, lb := len(a), len(b)
	if la > lb {
		a, b, la, lb = b, a, lb, la
	}
	if lb-la > 1 {
		return false
	}
	i, j, edits := 0, 0, 0
	for i < la && j < lb {
		if a[i] == b[j] {
			i++
			j++
			continue
		}
		edits++
		if edits > 1 {
			return false
		}
		if la == lb {
			i++ // substitution
		}
		j++ // insertion into a / skip in b
	}
	return edits+(lb-j) <= 1
}

// scoreSheetMatch scores how well OCR text from a photographed first page
// matches a note name, 0–100. The name side dominates: a short title fully
// contained in noisy OCR output should score high.
func scoreSheetMatch(ocrText, noteName string) int {
	nameTokens := normalizeSheetTokens(noteName)
	ocrTokens := normalizeSheetTokens(ocrText)
	if len(nameTokens) == 0 || len(ocrTokens) == 0 {
		return 0
	}
	matched := 0
	for _, tok := range nameTokens {
		if tokenMatches(tok, ocrTokens) {
			matched++
		}
	}
	return matched * 100 / len(nameTokens)
}

/* ------------------------- identify ------------------------- */

type IdentifyCandidate struct {
	NoteID        string `json:"noteId"`
	Name          string `json:"name"`
	InventoryNo   *int32 `json:"inventoryNo,omitempty"`
	NumberOfPages *int32 `json:"numberOfPages,omitempty"`
	FolderID      string `json:"folderId,omitempty"`
	Confidence    int    `json:"confidence"`
	MatchedVia    string `json:"matchedVia"` // OCR or AI
}

const identifyConfidentThreshold = 70
const identifyMinScore = 25
const identifyMaxCandidates = 5

// Identify matches OCR text (and, as a fallback, the AI vision reading of the
// photo) against the user's notes and returns ranked candidates.
func (s *InventoryService) Identify(userID, ocrText, imageBase64, mimeType string) ([]IdentifyCandidate, error) {
	notes, err := s.queries.ListNoteNamesForUser(s.ctx, db.NewSQLNullString(userID))
	if err != nil {
		return nil, err
	}

	candidates := rankNotes(notes, ocrText, "OCR")

	// AI fallback only when the text pass is unconvincing and a photo is available.
	best := 0
	if len(candidates) > 0 {
		best = candidates[0].Confidence
	}
	if best < identifyConfidentThreshold && imageBase64 != "" && s.ai != nil && s.ai.IsConfigured() {
		if id, aiErr := s.ai.IdentifyMusicFromImage(imageBase64, mimeType); aiErr == nil {
			aiCandidates := rankNotes(notes, id.Title+" "+id.Composer, "AI")
			candidates = mergeCandidates(candidates, aiCandidates)
		}
	}

	if len(candidates) > identifyMaxCandidates {
		candidates = candidates[:identifyMaxCandidates]
	}
	return candidates, nil
}

func rankNotes(notes []db.ListNoteNamesForUserRow, query, via string) []IdentifyCandidate {
	var out []IdentifyCandidate
	for _, n := range notes {
		score := scoreSheetMatch(query, n.Name.String)
		if score < identifyMinScore {
			continue
		}
		c := IdentifyCandidate{
			NoteID: n.ID, Name: n.Name.String, FolderID: n.Parent.String,
			Confidence: score, MatchedVia: via,
		}
		if n.InventoryNo.Valid {
			no := n.InventoryNo.Int32
			c.InventoryNo = &no
		}
		if n.NumberOfPages.Valid {
			pages := n.NumberOfPages.Int32
			c.NumberOfPages = &pages
		}
		out = append(out, c)
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].Confidence > out[j].Confidence })
	return out
}

// mergeCandidates keeps the higher-confidence entry per note.
func mergeCandidates(a, b []IdentifyCandidate) []IdentifyCandidate {
	byID := map[string]IdentifyCandidate{}
	for _, c := range append(a, b...) {
		if prev, ok := byID[c.NoteID]; !ok || c.Confidence > prev.Confidence {
			byID[c.NoteID] = c
		}
	}
	out := make([]IdentifyCandidate, 0, len(byID))
	for _, c := range byID {
		out = append(out, c)
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].Confidence > out[j].Confidence })
	return out
}

/* ------------------------- inventory numbers ------------------------- */

// AssignInventoryNo lazily assigns the next free number for the user;
// idempotent — an already numbered note keeps its number.
func (s *InventoryService) AssignInventoryNo(userID, noteID string) (int32, error) {
	note, err := s.queries.FindFolderById(s.ctx, db.FindFolderByIdParams{ID: noteID, UserIDFk: db.NewSQLNullString(userID)})
	if err != nil {
		return 0, ErrInventoryNotFound
	}
	if note.InventoryNo.Valid {
		return note.InventoryNo.Int32, nil
	}
	// MAX+1 races with concurrent assignments; the unique index rejects the
	// loser, who simply retries on the fresh maximum.
	for attempt := 0; attempt < 5; attempt++ {
		maxRaw, err := s.queries.MaxInventoryNoForUser(s.ctx, db.NewSQLNullString(userID))
		if err != nil {
			return 0, err
		}
		next := int32(toInt64(maxRaw)) + 1
		rows, err := s.queries.SetNoteInventoryNo(s.ctx, db.SetNoteInventoryNoParams{
			InventoryNo: sql.NullInt32{Int32: next, Valid: true},
			ID:          noteID,
			UserIDFk:    db.NewSQLNullString(userID),
		})
		if err != nil {
			continue // duplicate key: another note grabbed the number, retry
		}
		if rows == 1 {
			return next, nil
		}
		// rows == 0: a concurrent request numbered this note; read it back.
		note, err = s.queries.FindFolderById(s.ctx, db.FindFolderByIdParams{ID: noteID, UserIDFk: db.NewSQLNullString(userID)})
		if err == nil && note.InventoryNo.Valid {
			return note.InventoryNo.Int32, nil
		}
	}
	return 0, errors.New("could not assign inventory number")
}

func toInt64(v interface{}) int64 {
	switch n := v.(type) {
	case int64:
		return n
	case int32:
		return int64(n)
	case []byte:
		var out int64
		for _, ch := range n {
			if ch < '0' || ch > '9' {
				return out
			}
			out = out*10 + int64(ch-'0')
		}
		return out
	default:
		return 0
	}
}

type InventoryLookup struct {
	NoteID         string  `json:"noteId"`
	Name           string  `json:"name"`
	FolderID       string  `json:"folderId,omitempty"`
	FolderName     string  `json:"folderName,omitempty"`
	LastSeenAt     *string `json:"lastSeenAt,omitempty"`
	LastSeenFolder string  `json:"lastSeenFolder,omitempty"`
}

// Lookup resolves a stamped inventory number to the piece and its Mappe.
func (s *InventoryService) Lookup(userID string, no int32) (InventoryLookup, error) {
	row, err := s.queries.FindNoteByUserAndInventoryNo(s.ctx, db.FindNoteByUserAndInventoryNoParams{
		UserIDFk:    db.NewSQLNullString(userID),
		InventoryNo: sql.NullInt32{Int32: no, Valid: true},
	})
	if err != nil {
		return InventoryLookup{}, ErrInventoryNotFound
	}
	out := InventoryLookup{
		NoteID: row.ID, Name: row.Name.String,
		FolderID: row.Parent.String, FolderName: row.ParentName.String,
	}
	if sightings, err := s.queries.FindLastSightingsForNotes(s.ctx, []string{row.ID}); err == nil && len(sightings) > 0 {
		latest := sightings[0]
		if latest.CompletedAt.Valid {
			ts := latest.CompletedAt.Time.Format("2006-01-02T15:04:05Z07:00")
			out.LastSeenAt = &ts
			out.LastSeenFolder = latest.FolderName.String
		}
	}
	return out, nil
}

/* ------------------------- tags ------------------------- */

// BindTag (re)binds a fresh tag UUID to a folder; a previous tag for the
// folder is invalidated.
func (s *InventoryService) BindTag(userID, folderID string) (string, error) {
	folder, err := s.queries.FindFolderById(s.ctx, db.FindFolderByIdParams{ID: folderID, UserIDFk: db.NewSQLNullString(userID)})
	if err != nil || folder.Type != "folder" {
		return "", ErrInventoryNotFound
	}
	if err := s.queries.DeleteMappeTagForFolder(s.ctx, folderID); err != nil {
		return "", err
	}
	tagID := uuid.NewString()
	if err := s.queries.CreateMappeTag(s.ctx, db.CreateMappeTagParams{
		TagID: tagID, FolderFk: folderID, UserFk: userID,
	}); err != nil {
		return "", err
	}
	return tagID, nil
}

type ResolvedTag struct {
	FolderID   string `json:"folderId"`
	FolderName string `json:"folderName"`
}

// ResolveTag maps a scanned tag back to the bound folder. Tags are personal:
// foreign tags resolve to not-found.
func (s *InventoryService) ResolveTag(userID, tagID string) (ResolvedTag, error) {
	tag, err := s.queries.FindMappeTag(s.ctx, tagID)
	if err != nil || tag.UserFk != userID {
		return ResolvedTag{}, ErrInventoryNotFound
	}
	return ResolvedTag{FolderID: tag.FolderFk, FolderName: tag.FolderName.String}, nil
}

/* ------------------------- sweeps ------------------------- */

// CreateSweep opens a sweep session for an owned folder.
func (s *InventoryService) CreateSweep(userID, folderID string) (string, error) {
	folder, err := s.queries.FindFolderById(s.ctx, db.FindFolderByIdParams{ID: folderID, UserIDFk: db.NewSQLNullString(userID)})
	if err != nil || folder.Type != "folder" {
		return "", ErrInventoryNotFound
	}
	id := uuid.NewString()
	if err := s.queries.CreateInventorySweep(s.ctx, db.CreateInventorySweepParams{
		ID: id, FolderFk: folderID, UserFk: userID,
	}); err != nil {
		return "", err
	}
	return id, nil
}

func (s *InventoryService) ownedSweep(userID, sweepID string) (db.InventorySweep, error) {
	sweep, err := s.queries.FindInventorySweep(s.ctx, sweepID)
	if err != nil {
		return db.InventorySweep{}, ErrInventoryNotFound
	}
	if sweep.UserFk != userID {
		return db.InventorySweep{}, ErrInventoryNotFound
	}
	return sweep, nil
}

type SightingResult struct {
	AlreadySighted bool   `json:"alreadySighted"`
	InventoryNo    int32  `json:"inventoryNo"`
	NoteName       string `json:"noteName"`
}

// AddSighting records "this note is physically in the swept Mappe". The
// note's inventory number is assigned here if it has none yet — the sweep is
// the stamping opportunity.
func (s *InventoryService) AddSighting(userID, sweepID, noteID, matchedVia string, confidence *int, incomplete bool) (SightingResult, error) {
	sweep, err := s.ownedSweep(userID, sweepID)
	if err != nil {
		return SightingResult{}, err
	}
	if sweep.CompletedAt.Valid {
		return SightingResult{}, ErrSweepCompleted
	}
	note, err := s.queries.FindFolderById(s.ctx, db.FindFolderByIdParams{ID: noteID, UserIDFk: db.NewSQLNullString(userID)})
	if err != nil || note.Type != "note" {
		return SightingResult{}, ErrInventoryNotFound
	}

	via := db.InventorySightingMatchedViaMANUAL
	switch strings.ToUpper(matchedVia) {
	case "OCR":
		via = db.InventorySightingMatchedViaOCR
	case "AI":
		via = db.InventorySightingMatchedViaAI
	}
	var conf sql.NullInt16
	if confidence != nil {
		conf = sql.NullInt16{Int16: int16(*confidence), Valid: true}
	}
	rows, err := s.queries.CreateInventorySighting(s.ctx, db.CreateInventorySightingParams{
		SweepFk: sweepID, NoteFk: noteID, MatchedVia: via, Confidence: conf, Incomplete: incomplete,
	})
	if err != nil {
		return SightingResult{}, err
	}
	no, err := s.AssignInventoryNo(userID, noteID)
	if err != nil {
		return SightingResult{}, err
	}
	return SightingResult{AlreadySighted: rows == 0, InventoryNo: no, NoteName: note.Name.String}, nil
}

type ReportEntry struct {
	NoteID         string `json:"noteId"`
	Name           string `json:"name"`
	InventoryNo    *int32 `json:"inventoryNo,omitempty"`
	Incomplete     bool   `json:"incomplete"`
	PreviousFolder string `json:"previousFolderName,omitempty"`
	LastSeenAt     string `json:"lastSeenAt,omitempty"`
	LastSeenFolder string `json:"lastSeenFolderName,omitempty"`
}

type SweepReport struct {
	Present    []ReportEntry `json:"present"`
	NewHere    []ReportEntry `json:"newHere"`
	Missing    []ReportEntry `json:"missing"`
	Incomplete []ReportEntry `json:"incomplete"`
}

// CompleteSweep marks the sweep done and returns the reconciliation report.
func (s *InventoryService) CompleteSweep(userID, sweepID string) (SweepReport, error) {
	sweep, err := s.ownedSweep(userID, sweepID)
	if err != nil {
		return SweepReport{}, err
	}
	if sweep.CompletedAt.Valid {
		return SweepReport{}, ErrSweepCompleted
	}
	if err := s.queries.CompleteInventorySweep(s.ctx, sweepID); err != nil {
		return SweepReport{}, err
	}

	sightings, err := s.queries.ListSightingsForSweep(s.ctx, sweepID)
	if err != nil {
		return SweepReport{}, err
	}
	folderNotes, err := s.queries.FindNotesInFolderForInventory(s.ctx, db.FindNotesInFolderForInventoryParams{
		Parent: db.NewSQLNullString(sweep.FolderFk), UserIDFk: db.NewSQLNullString(userID),
	})
	if err != nil {
		return SweepReport{}, err
	}

	report := SweepReport{
		Present: []ReportEntry{}, NewHere: []ReportEntry{}, Missing: []ReportEntry{}, Incomplete: []ReportEntry{},
	}
	sighted := map[string]bool{}
	for _, sg := range sightings {
		sighted[sg.NoteFk] = true
		entry := ReportEntry{NoteID: sg.NoteFk, Name: sg.NoteName.String, Incomplete: sg.Incomplete}
		if sg.InventoryNo.Valid {
			no := sg.InventoryNo.Int32
			entry.InventoryNo = &no
		}
		if sg.ParentID.String == sweep.FolderFk {
			report.Present = append(report.Present, entry)
		} else {
			entry.PreviousFolder = sg.ParentName.String
			report.NewHere = append(report.NewHere, entry)
		}
		if sg.Incomplete {
			report.Incomplete = append(report.Incomplete, entry)
		}
	}

	var missingIDs []string
	missingByID := map[string]ReportEntry{}
	for _, n := range folderNotes {
		if sighted[n.ID] {
			continue
		}
		entry := ReportEntry{NoteID: n.ID, Name: n.Name.String}
		if n.InventoryNo.Valid {
			no := n.InventoryNo.Int32
			entry.InventoryNo = &no
		}
		missingIDs = append(missingIDs, n.ID)
		missingByID[n.ID] = entry
	}
	if len(missingIDs) > 0 {
		// Rows are ordered newest-first; keep the first (= latest) per note.
		// The just-completed sweep can't contain missing notes by definition.
		if lastSeen, err := s.queries.FindLastSightingsForNotes(s.ctx, missingIDs); err == nil {
			for _, row := range lastSeen {
				entry, ok := missingByID[row.NoteFk]
				if !ok || entry.LastSeenAt != "" {
					continue
				}
				entry.LastSeenAt = row.CompletedAt.Time.Format("2006-01-02T15:04:05Z07:00")
				entry.LastSeenFolder = row.FolderName.String
				missingByID[row.NoteFk] = entry
			}
		}
	}
	for _, id := range missingIDs {
		report.Missing = append(report.Missing, missingByID[id])
	}
	return report, nil
}

// ApplyMoves re-homes sighted notes to the swept folder (updates parent).
func (s *InventoryService) ApplyMoves(userID, sweepID string, noteIDs []string) error {
	sweep, err := s.ownedSweep(userID, sweepID)
	if err != nil {
		return err
	}
	sightings, err := s.queries.ListSightingsForSweep(s.ctx, sweepID)
	if err != nil {
		return err
	}
	sighted := map[string]bool{}
	for _, sg := range sightings {
		sighted[sg.NoteFk] = true
	}
	for _, noteID := range noteIDs {
		if !sighted[noteID] {
			return errors.New("note was not sighted in this sweep: " + noteID)
		}
	}
	for _, noteID := range noteIDs {
		if err := s.queries.MoveToFolder(s.ctx, db.MoveToFolderParams{
			Parent: db.NewSQLNullString(sweep.FolderFk), ID: noteID, UserIDFk: db.NewSQLNullString(userID),
		}); err != nil {
			return err
		}
	}
	return nil
}

// LastSeen returns the newest completed-sweep sighting for a note.
func (s *InventoryService) LastSeen(userID, noteID string) (*InventoryLookup, error) {
	note, err := s.queries.FindFolderById(s.ctx, db.FindFolderByIdParams{ID: noteID, UserIDFk: db.NewSQLNullString(userID)})
	if err != nil {
		return nil, ErrInventoryNotFound
	}
	out := &InventoryLookup{NoteID: note.ID, Name: note.Name.String}
	sightings, err := s.queries.FindLastSightingsForNotes(s.ctx, []string{noteID})
	if err != nil || len(sightings) == 0 {
		return out, nil
	}
	latest := sightings[0]
	if latest.CompletedAt.Valid {
		ts := latest.CompletedAt.Time.Format("2006-01-02T15:04:05Z07:00")
		out.LastSeenAt = &ts
		out.LastSeenFolder = latest.FolderName.String
		out.FolderID = latest.FolderFk
	}
	return out, nil
}
