package dto

// AutocompleteAuthor is the wire shape for both local and external author
// suggestions. ID is set for local matches; WikidataID is set for external
// matches; either or both may be set when a local author has been linked.
type AutocompleteAuthor struct {
	ID          string `json:"id,omitempty"`
	WikidataID  string `json:"wikidataId,omitempty"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	BirthYear   *int16 `json:"birthYear,omitempty"`
	DeathYear   *int16 `json:"deathYear,omitempty"`
}

// AutocompleteWork is the wire shape for work suggestions.
type AutocompleteWork struct {
	ID              string              `json:"id,omitempty"`
	WikidataID      string              `json:"wikidataId,omitempty"`
	Name            string              `json:"name"`
	Description     string              `json:"description,omitempty"`
	CompositionYear *int16              `json:"compositionYear,omitempty"`
	Genre           string              `json:"genre,omitempty"`
	Composer        *AutocompleteAuthor `json:"composer,omitempty"`
	Arranger        *AutocompleteAuthor `json:"arranger,omitempty"`
}

type AutocompleteWorksResponse struct {
	Local    []AutocompleteWork `json:"local"`
	External []AutocompleteWork `json:"external"`
}

type AutocompleteAuthorsResponse struct {
	Local    []AutocompleteAuthor `json:"local"`
	External []AutocompleteAuthor `json:"external"`
}

// WorkFromWikidataRequest creates a note from a known Wikidata QID.
// ForceNewAuthor bypasses the conflict-detection path: when true and the
// resolved composer collides with an existing local name, a separate
// author record is created (the local author keeps its lack-of-QID).
type WorkFromWikidataRequest struct {
	WikidataID     string `json:"wikidataId"     validate:"required"`
	ParentID       string `json:"parentId"       validate:"required"`
	ForceNewAuthor bool   `json:"forceNewAuthor"`
}

// WorkFromWikidataConflictResponse is returned with HTTP 409 when the
// resolved composer would collide with an existing local author. Frontend
// surfaces a dialog letting the user pick "link to existing" (PATCH the
// candidate's wikidata_id) or "create new" (retry with ForceNewAuthor).
type WorkFromWikidataConflictResponse struct {
	Incoming   AutocompleteAuthor   `json:"incoming"`
	Candidates []AutocompleteAuthor `json:"candidates"`
}
