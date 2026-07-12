package service

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

// WikidataAuthor is a Wikidata-sourced view of a person (composer / arranger / author).
type WikidataAuthor struct {
	WikidataID  string `json:"wikidataId"`
	Name        string `json:"name"`
	Description string `json:"description"`
	BirthYear   *int16 `json:"birthYear,omitempty"`
	DeathYear   *int16 `json:"deathYear,omitempty"`
}

// WikidataWork is a Wikidata-sourced view of a musical work / song.
type WikidataWork struct {
	WikidataID  string          `json:"wikidataId"`
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Composer    *WikidataAuthor `json:"composer,omitempty"`
	// CoComposers holds any further composers beyond the primary one; the data
	// model links a single composer, so these end up as a note on the work.
	CoComposers []WikidataAuthor `json:"coComposers,omitempty"`
	Year        *int16           `json:"year,omitempty"`
	Genre       string           `json:"genre,omitempty"`
}

const (
	wikidataRateLimitBackoff  = time.Second
	wikidataRateLimitCooldown = 5 * time.Minute
)

// WikidataService queries the public Wikidata SPARQL endpoint.
type WikidataService struct {
	Endpoint  string
	UserAgent string
	Client    *http.Client

	// 429 handling: one short backoff retry; a repeated 429 opens a cooldown
	// window during which external lookups fail fast and callers degrade to
	// local-only results. Wikidata rate-limits per client IP, so one shared
	// window (rather than per user) is what actually stops the hammering.
	mu            sync.Mutex
	cooldownUntil time.Time
	now           func() time.Time
	sleep         func(time.Duration)
}

func NewWikidataService(endpoint, userAgent string) *WikidataService {
	return &WikidataService{
		Endpoint:  endpoint,
		UserAgent: userAgent,
		Client:    &http.Client{Timeout: 10 * time.Second},
		now:       time.Now,
		sleep:     time.Sleep,
	}
}

type sparqlBinding struct {
	Type  string `json:"type"`
	Value string `json:"value"`
}

type sparqlResponse struct {
	Results struct {
		Bindings []map[string]sparqlBinding `json:"bindings"`
	} `json:"results"`
}

func (s *WikidataService) runQuery(sparql string) (*sparqlResponse, error) {
	if until, active := s.cooldownActive(); active {
		return nil, fmt.Errorf("wikidata rate-limit cooldown active until %s", until.Format(time.RFC3339))
	}
	resp, err := s.doSparqlRequest(sparql)
	if isRateLimited(err) {
		// One short backoff; if the endpoint is still rate-limiting after that,
		// stop hitting it for a while instead of failing every user keystroke.
		log.Printf("wikidata returned 429, backing off %s and retrying once", wikidataRateLimitBackoff)
		s.sleep(wikidataRateLimitBackoff)
		resp, err = s.doSparqlRequest(sparql)
		if isRateLimited(err) {
			s.startCooldown()
			log.Printf("wikidata still rate-limited, pausing external lookups for %s", wikidataRateLimitCooldown)
		}
		return resp, err
	}
	// Wikidata's public endpoint sporadically returns 502/503 for a few seconds
	// during load spikes. One quick retry catches most of these without making
	// the user re-type. Anything beyond a single retry is the user's problem
	// to recover from (or we'd need real backoff + cache, which is YAGNI here).
	if shouldRetry(resp, err) {
		log.Printf("wikidata transient failure, retrying once after 500ms")
		s.sleep(500 * time.Millisecond)
		resp, err = s.doSparqlRequest(sparql)
	}
	return resp, err
}

func (s *WikidataService) cooldownActive() (time.Time, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.now().Before(s.cooldownUntil) {
		return s.cooldownUntil, true
	}
	return time.Time{}, false
}

func (s *WikidataService) startCooldown() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.cooldownUntil = s.now().Add(wikidataRateLimitCooldown)
}

func isRateLimited(err error) bool {
	var httpErr *wikidataHTTPError
	return errAs(err, &httpErr) && httpErr.Status == http.StatusTooManyRequests
}

func (s *WikidataService) doSparqlRequest(sparql string) (*sparqlResponse, error) {
	form := url.Values{}
	form.Set("query", sparql)
	form.Set("format", "json")
	req, err := http.NewRequest("POST", s.Endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/sparql-results+json")
	req.Header.Set("User-Agent", s.UserAgent)
	resp, err := s.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("wikidata returned %d: %s", resp.StatusCode, string(body))
		return nil, &wikidataHTTPError{Status: resp.StatusCode, Body: string(body)}
	}
	var parsed sparqlResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		log.Printf("wikidata json decode error: %v", err)
		return nil, err
	}
	return &parsed, nil
}

type wikidataHTTPError struct {
	Status int
	Body   string
}

func (e *wikidataHTTPError) Error() string {
	return fmt.Sprintf("wikidata returned %d: %s", e.Status, e.Body)
}

func shouldRetry(_ *sparqlResponse, err error) bool {
	if err == nil {
		return false
	}
	var httpErr *wikidataHTTPError
	if errAs(err, &httpErr) {
		return httpErr.Status >= 500 && httpErr.Status < 600
	}
	// Network-level errors (timeouts, DNS failures) are also worth one retry.
	return true
}

// errAs is errors.As without the import cycle headache — keeps this file's
// imports small.
func errAs(err error, target **wikidataHTTPError) bool {
	if e, ok := err.(*wikidataHTTPError); ok {
		*target = e
		return true
	}
	return false
}

func qidFromURI(uri string) string {
	idx := strings.LastIndex(uri, "/")
	if idx < 0 {
		return uri
	}
	return uri[idx+1:]
}

func parseYear(s string) *int16 {
	if s == "" {
		return nil
	}
	year, err := strconv.Atoi(s)
	if err != nil {
		return nil
	}
	y := int16(year)
	return &y
}

func parseYearFromISO(s string) *int16 {
	if len(s) < 4 {
		return nil
	}
	return parseYear(s[:4])
}

// Wikidata accepts only escaped quotes inside SPARQL string literals; everything
// else in a search term is harmless. Strip backslash too to avoid accidental
// escape sequences.
func sanitizeTerm(t string) string {
	return strings.ReplaceAll(strings.ReplaceAll(t, `"`, ""), `\`, "")
}

// SearchWorks returns up to 10 musical works whose label or alias matches the
// term. Uses Wikidata's MWAPI EntitySearch (full-text indexed, fast) and then
// filters to entities that have a composer (P86) — a reliable "is a work"
// proxy without paying for a P31/P279* subclass walk over the whole graph.
func (s *WikidataService) SearchWorks(term string) ([]WikidataWork, error) {
	sparql := `SELECT ?work ?workLabel ?workDescription ?composer ?composerLabel ?year WHERE {
	  SERVICE wikibase:mwapi {
	    bd:serviceParam wikibase:api "EntitySearch" .
	    bd:serviceParam wikibase:endpoint "www.wikidata.org" .
	    bd:serviceParam mwapi:search "` + sanitizeTerm(term) + `" .
	    bd:serviceParam mwapi:language "de" .
	    bd:serviceParam mwapi:limit "20" .
	    ?work wikibase:apiOutputItem mwapi:item .
	  }
	  ?work wdt:P86 ?composer .
	  OPTIONAL { ?work wdt:P571 ?inception . BIND(YEAR(?inception) AS ?inceptionYear) }
	  OPTIONAL { ?work wdt:P577 ?pubDate . BIND(YEAR(?pubDate) AS ?pubYear) }
	  BIND(COALESCE(?inceptionYear, ?pubYear) AS ?year)
	  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en" . }
	} LIMIT 10`

	resp, err := s.runQuery(sparql)
	if err != nil {
		log.Printf("wikidata SearchWorks(%q) failed: %v", term, err)
		return nil, err
	}
	log.Printf("wikidata SearchWorks(%q): %d results", term, len(resp.Results.Bindings))
	works := make([]WikidataWork, 0, len(resp.Results.Bindings))
	for _, row := range resp.Results.Bindings {
		work := WikidataWork{
			WikidataID:  qidFromURI(row["work"].Value),
			Name:        row["workLabel"].Value,
			Description: row["workDescription"].Value,
			Year:        parseYear(row["year"].Value),
		}
		if c, ok := row["composer"]; ok && c.Value != "" {
			work.Composer = &WikidataAuthor{
				WikidataID: qidFromURI(c.Value),
				Name:       row["composerLabel"].Value,
			}
		}
		works = append(works, work)
	}
	return works, nil
}

// SearchAuthors returns up to 10 people active as composer / arranger / lyricist.
// Same MWAPI EntitySearch approach as SearchWorks.
func (s *WikidataService) SearchAuthors(term string) ([]WikidataAuthor, error) {
	sparql := `SELECT ?person ?personLabel ?personDescription ?birth ?death WHERE {
	  SERVICE wikibase:mwapi {
	    bd:serviceParam wikibase:api "EntitySearch" .
	    bd:serviceParam wikibase:endpoint "www.wikidata.org" .
	    bd:serviceParam mwapi:search "` + sanitizeTerm(term) + `" .
	    bd:serviceParam mwapi:language "de" .
	    bd:serviceParam mwapi:limit "20" .
	    ?person wikibase:apiOutputItem mwapi:item .
	  }
	  ?person wdt:P106 ?occupation .
	  VALUES ?occupation {
	    wd:Q36834   # composer
	    wd:Q486748  # arranger
	    wd:Q488205  # lyricist
	    wd:Q639669  # musician (includes band leaders, arrangers without explicit role)
	    wd:Q753110  # songwriter
	    wd:Q158852  # conductor (often double as composers in wind/brass music)
	  }
	  OPTIONAL { ?person wdt:P569 ?birth . }
	  OPTIONAL { ?person wdt:P570 ?death . }
	  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en" . }
	} LIMIT 10`

	resp, err := s.runQuery(sparql)
	if err != nil {
		log.Printf("wikidata SearchAuthors(%q) failed: %v", term, err)
		return nil, err
	}
	log.Printf("wikidata SearchAuthors(%q): %d results", term, len(resp.Results.Bindings))
	authors := make([]WikidataAuthor, 0, len(resp.Results.Bindings))
	for _, row := range resp.Results.Bindings {
		a := WikidataAuthor{
			WikidataID:  qidFromURI(row["person"].Value),
			Name:        row["personLabel"].Value,
			Description: row["personDescription"].Value,
			BirthYear:   parseYearFromISO(row["birth"].Value),
			DeathYear:   parseYearFromISO(row["death"].Value),
		}
		authors = append(authors, a)
	}
	return authors, nil
}

// GetWorkDetail fetches a single work by QID, preferring P86 (composer) over
// P50 (author) over P175 (performer) for the resolved primary-author link.
// Works with several composers (e.g. Andersson/Ulvaeus) keep the first as the
// primary and expose the rest via CoComposers.
func (s *WikidataService) GetWorkDetail(qid string) (*WikidataWork, error) {
	sparql := `SELECT ?workLabel ?workDescription ?composer ?composerLabel ?author ?authorLabel ?performer ?performerLabel ?year ?genreLabel WHERE {
	  BIND(wd:` + qid + ` AS ?work)
	  OPTIONAL { ?work wdt:P86 ?composer . }
	  OPTIONAL { ?work wdt:P50 ?author . }
	  OPTIONAL { ?work wdt:P175 ?performer . }
	  OPTIONAL { ?work wdt:P571 ?inception . BIND(YEAR(?inception) AS ?inceptionYear) }
	  OPTIONAL { ?work wdt:P577 ?pubDate . BIND(YEAR(?pubDate) AS ?pubYear) }
	  BIND(COALESCE(?inceptionYear, ?pubYear) AS ?year)
	  OPTIONAL { ?work wdt:P136 ?genre . }
	  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en" . }
	} LIMIT 10`

	resp, err := s.runQuery(sparql)
	if err != nil {
		return nil, err
	}
	if len(resp.Results.Bindings) == 0 {
		return nil, fmt.Errorf("work %s not found in wikidata", qid)
	}
	row := resp.Results.Bindings[0]
	work := &WikidataWork{
		WikidataID:  qid,
		Name:        row["workLabel"].Value,
		Description: row["workDescription"].Value,
		Year:        parseYear(row["year"].Value),
		Genre:       row["genreLabel"].Value,
	}
	// Multi-valued OPTIONALs multiply rows, so collect distinct persons across
	// all rows for the highest-priority role that is present at all.
	for _, key := range []string{"composer", "author", "performer"} {
		var persons []WikidataAuthor
		seen := map[string]bool{}
		for _, r := range resp.Results.Bindings {
			v, ok := r[key]
			if !ok || v.Value == "" {
				continue
			}
			personQID := qidFromURI(v.Value)
			if seen[personQID] {
				continue
			}
			seen[personQID] = true
			persons = append(persons, WikidataAuthor{
				WikidataID: personQID,
				Name:       r[key+"Label"].Value,
			})
		}
		if len(persons) > 0 {
			work.Composer = &persons[0]
			work.CoComposers = persons[1:]
			break
		}
	}
	return work, nil
}

// GetAuthorDetail fetches a single person by QID with their lifespan years.
func (s *WikidataService) GetAuthorDetail(qid string) (*WikidataAuthor, error) {
	sparql := `SELECT ?personLabel ?personDescription ?birth ?death WHERE {
	  BIND(wd:` + qid + ` AS ?person)
	  OPTIONAL { ?person wdt:P569 ?birth . }
	  OPTIONAL { ?person wdt:P570 ?death . }
	  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en" . }
	} LIMIT 1`

	resp, err := s.runQuery(sparql)
	if err != nil {
		return nil, err
	}
	if len(resp.Results.Bindings) == 0 {
		return nil, fmt.Errorf("author %s not found in wikidata", qid)
	}
	row := resp.Results.Bindings[0]
	return &WikidataAuthor{
		WikidataID:  qid,
		Name:        row["personLabel"].Value,
		Description: row["personDescription"].Value,
		BirthYear:   parseYearFromISO(row["birth"].Value),
		DeathYear:   parseYearFromISO(row["death"].Value),
	}, nil
}
