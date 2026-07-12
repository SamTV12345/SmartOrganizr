package service

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func mockWikidata(t *testing.T, body string) (*httptest.Server, *WikidataService) {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/sparql-results+json")
		w.Write([]byte(body))
	}))
	wd := NewWikidataService(srv.URL, "SmartOrganizr-Test/1.0")
	return srv, wd
}

func TestWikidataService_SearchWorks_ParsesResult(t *testing.T) {
	body := `{
	  "results": {
	    "bindings": [
	      {
	        "work": {"value": "http://www.wikidata.org/entity/Q4791234"},
	        "workLabel": {"value": "Armenian Dances"},
	        "workDescription": {"value": "suite for concert band by Alfred Reed"},
	        "composer": {"value": "http://www.wikidata.org/entity/Q371953"},
	        "composerLabel": {"value": "Alfred Reed"},
	        "year": {"value": "1972"}
	      }
	    ]
	  }
	}`
	srv, wd := mockWikidata(t, body)
	defer srv.Close()

	works, err := wd.SearchWorks("Armenian")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(works) != 1 {
		t.Fatalf("expected 1 work, got %d", len(works))
	}
	w := works[0]
	if w.WikidataID != "Q4791234" {
		t.Errorf("expected QID Q4791234, got %s", w.WikidataID)
	}
	if w.Name != "Armenian Dances" {
		t.Errorf("expected name 'Armenian Dances', got %s", w.Name)
	}
	if w.Composer == nil || w.Composer.WikidataID != "Q371953" {
		t.Errorf("expected composer Q371953, got %+v", w.Composer)
	}
	if w.Year == nil || *w.Year != 1972 {
		t.Errorf("expected year 1972, got %+v", w.Year)
	}
}

func TestWikidataService_SearchAuthors_ParsesResult(t *testing.T) {
	body := `{
	  "results": {
	    "bindings": [
	      {
	        "person": {"value": "http://www.wikidata.org/entity/Q371953"},
	        "personLabel": {"value": "Alfred Reed"},
	        "personDescription": {"value": "American composer (1921-2005)"},
	        "birth": {"value": "1921-01-25T00:00:00Z"},
	        "death": {"value": "2005-09-17T00:00:00Z"}
	      }
	    ]
	  }
	}`
	srv, wd := mockWikidata(t, body)
	defer srv.Close()

	authors, err := wd.SearchAuthors("Reed")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(authors) != 1 {
		t.Fatalf("expected 1 author, got %d", len(authors))
	}
	a := authors[0]
	if a.WikidataID != "Q371953" {
		t.Errorf("expected Q371953, got %s", a.WikidataID)
	}
	if a.BirthYear == nil || *a.BirthYear != 1921 {
		t.Errorf("expected birth 1921, got %+v", a.BirthYear)
	}
	if a.DeathYear == nil || *a.DeathYear != 2005 {
		t.Errorf("expected death 2005, got %+v", a.DeathYear)
	}
}

func TestWikidataService_GetWorkDetail_PicksFirstAvailableAuthor(t *testing.T) {
	body := `{
	  "results": {
	    "bindings": [
	      {
	        "workLabel": {"value": "Dancing Queen"},
	        "workDescription": {"value": "ABBA song"},
	        "composer": {"value": "http://www.wikidata.org/entity/Q205721"},
	        "composerLabel": {"value": "Benny Andersson"},
	        "year": {"value": "1976"}
	      }
	    ]
	  }
	}`
	srv, wd := mockWikidata(t, body)
	defer srv.Close()

	work, err := wd.GetWorkDetail("Q204195")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if work.Name != "Dancing Queen" {
		t.Errorf("expected 'Dancing Queen', got %s", work.Name)
	}
	if work.Composer == nil || work.Composer.WikidataID != "Q205721" {
		t.Errorf("expected composer Q205721, got %+v", work.Composer)
	}
}

func TestWikidataService_GetWorkDetail_FallsBackToPerformer(t *testing.T) {
	body := `{
	  "results": {
	    "bindings": [
	      {
	        "workLabel": {"value": "Some Anonymous Song"},
	        "performer": {"value": "http://www.wikidata.org/entity/Q9999"},
	        "performerLabel": {"value": "Some Band"}
	      }
	    ]
	  }
	}`
	srv, wd := mockWikidata(t, body)
	defer srv.Close()

	work, err := wd.GetWorkDetail("Q123456")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if work.Composer == nil || work.Composer.WikidataID != "Q9999" {
		t.Errorf("expected performer Q9999, got %+v", work.Composer)
	}
	if work.Composer.Name != "Some Band" {
		t.Errorf("expected name 'Some Band', got %s", work.Composer.Name)
	}
}

func TestWikidataService_GetAuthorDetail(t *testing.T) {
	body := `{
	  "results": {
	    "bindings": [
	      {
	        "personLabel": {"value": "Alfred Reed"},
	        "personDescription": {"value": "American composer"},
	        "birth": {"value": "1921-01-25T00:00:00Z"},
	        "death": {"value": "2005-09-17T00:00:00Z"}
	      }
	    ]
	  }
	}`
	srv, wd := mockWikidata(t, body)
	defer srv.Close()

	a, err := wd.GetAuthorDetail("Q371953")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if a.WikidataID != "Q371953" {
		t.Errorf("expected Q371953, got %s", a.WikidataID)
	}
	if a.BirthYear == nil || *a.BirthYear != 1921 {
		t.Errorf("expected birth 1921, got %+v", a.BirthYear)
	}
}

func TestWikidataService_GetWorkDetail_NotFound(t *testing.T) {
	body := `{"results": {"bindings": []}}`
	srv, wd := mockWikidata(t, body)
	defer srv.Close()

	_, err := wd.GetWorkDetail("Q0")
	if err == nil {
		t.Fatal("expected error for empty result")
	}
}

func TestWikidataService_GetWorkDetail_MultipleComposers(t *testing.T) {
	// Two composers (Andersson/Ulvaeus style) arrive as two bindings rows;
	// genre duplication would multiply rows further, hence the repeated pair.
	body := `{
	  "results": {
	    "bindings": [
	      {
	        "workLabel": {"value": "Dancing Queen"},
	        "workDescription": {"value": "1976 song"},
	        "composer": {"value": "http://www.wikidata.org/entity/Q52927"},
	        "composerLabel": {"value": "Benny Andersson"},
	        "year": {"value": "1976"}
	      },
	      {
	        "workLabel": {"value": "Dancing Queen"},
	        "workDescription": {"value": "1976 song"},
	        "composer": {"value": "http://www.wikidata.org/entity/Q53026"},
	        "composerLabel": {"value": "Björn Ulvaeus"},
	        "year": {"value": "1976"}
	      },
	      {
	        "workLabel": {"value": "Dancing Queen"},
	        "workDescription": {"value": "1976 song"},
	        "composer": {"value": "http://www.wikidata.org/entity/Q52927"},
	        "composerLabel": {"value": "Benny Andersson"},
	        "year": {"value": "1976"}
	      }
	    ]
	  }
	}`
	srv, wd := mockWikidata(t, body)
	defer srv.Close()

	w, err := wd.GetWorkDetail("Q756100")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if w.Composer == nil || w.Composer.WikidataID != "Q52927" {
		t.Fatalf("expected primary composer Q52927, got %+v", w.Composer)
	}
	if len(w.CoComposers) != 1 || w.CoComposers[0].Name != "Björn Ulvaeus" {
		t.Fatalf("expected one co-composer Björn Ulvaeus, got %+v", w.CoComposers)
	}
}

func TestWikidataService_RateLimitBackoffAndCooldown(t *testing.T) {
	var calls int
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer srv.Close()

	wd := NewWikidataService(srv.URL, "SmartOrganizr-Test/1.0")
	var slept []time.Duration
	wd.sleep = func(d time.Duration) { slept = append(slept, d) }
	current := time.Unix(1_000_000, 0)
	wd.now = func() time.Time { return current }

	// First query: 429, one backoff retry, second 429 opens the cooldown.
	if _, err := wd.SearchWorks("term"); err == nil {
		t.Fatal("expected error while rate-limited")
	}
	if calls != 2 {
		t.Fatalf("expected initial attempt + one retry, got %d calls", calls)
	}
	if len(slept) != 1 || slept[0] != wikidataRateLimitBackoff {
		t.Fatalf("expected one %s backoff sleep, got %+v", wikidataRateLimitBackoff, slept)
	}

	// During the cooldown no request must reach the endpoint.
	if _, err := wd.SearchWorks("term"); err == nil {
		t.Fatal("expected cooldown error")
	}
	if calls != 2 {
		t.Fatalf("expected no further calls during cooldown, got %d", calls)
	}

	// After the cooldown expires requests flow again.
	current = current.Add(wikidataRateLimitCooldown + time.Second)
	if _, err := wd.SearchWorks("term"); err == nil {
		t.Fatal("still 429 from server, expected error")
	}
	if calls != 4 {
		t.Fatalf("expected requests to resume after cooldown, got %d calls", calls)
	}
}

func TestCoComposerNote(t *testing.T) {
	if got := coComposerNote(nil); got != "" {
		t.Fatalf("expected empty note, got %q", got)
	}
	note := coComposerNote([]WikidataAuthor{{Name: "Björn Ulvaeus"}, {Name: ""}, {Name: "Stig Anderson"}})
	if note != "Co-composed with Björn Ulvaeus, Stig Anderson" {
		t.Fatalf("unexpected note: %q", note)
	}
}
