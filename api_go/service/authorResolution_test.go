package service

import (
	"api_go/models"
	"testing"
)

type fakeResolver struct {
	byQID   map[string]models.Author
	byName  map[string][]models.Author
	created []models.Author
}

func (f *fakeResolver) FindByWikidataID(_ string, qid string) (*models.Author, error) {
	if a, ok := f.byQID[qid]; ok {
		return &a, nil
	}
	return nil, nil
}

func (f *fakeResolver) FindByExactName(_ string, name string) ([]models.Author, error) {
	return f.byName[name], nil
}

func (f *fakeResolver) Create(_ string, a models.Author) (models.Author, error) {
	f.created = append(f.created, a)
	created := a
	created.ID = "new-" + a.WikidataID
	return created, nil
}

func TestResolveAuthor_QIDMatchReturnsExistingAuthor(t *testing.T) {
	existing := models.Author{ID: "existing-id", Name: "Alfred Reed", WikidataID: "Q371953"}
	r := &fakeResolver{byQID: map[string]models.Author{"Q371953": existing}}

	res, err := ResolveAuthor(r, "user-1", WikidataAuthor{WikidataID: "Q371953", Name: "Alfred Reed"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res.Status != ResolveStatusMatched {
		t.Errorf("expected matched, got %v", res.Status)
	}
	if res.Author.ID != "existing-id" {
		t.Errorf("expected existing-id, got %s", res.Author.ID)
	}
	if len(r.created) != 0 {
		t.Errorf("expected no create, got %d", len(r.created))
	}
}

func TestResolveAuthor_SameNameNoQIDReturnsConflict(t *testing.T) {
	local := models.Author{ID: "local-id", Name: "Johann Strauss", WikidataID: ""}
	r := &fakeResolver{
		byQID:  map[string]models.Author{},
		byName: map[string][]models.Author{"Johann Strauss": {local}},
	}

	res, err := ResolveAuthor(r, "user-1", WikidataAuthor{WikidataID: "Q7349", Name: "Johann Strauss"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res.Status != ResolveStatusConflict {
		t.Errorf("expected conflict, got %v", res.Status)
	}
	if len(res.Candidates) != 1 || res.Candidates[0].ID != "local-id" {
		t.Errorf("expected 1 candidate local-id, got %+v", res.Candidates)
	}
	if len(r.created) != 0 {
		t.Errorf("conflict path should not create, got %d", len(r.created))
	}
}

func TestResolveAuthor_SameNameWithQIDIsNotAConflict(t *testing.T) {
	// If a local author has the same name AND already has a (different) QID,
	// it's a different person — we should fall through to creating a new author.
	differentPerson := models.Author{ID: "other-id", Name: "Johann Strauss", WikidataID: "Q123456"}
	r := &fakeResolver{
		byQID:  map[string]models.Author{},
		byName: map[string][]models.Author{"Johann Strauss": {differentPerson}},
	}

	res, err := ResolveAuthor(r, "user-1", WikidataAuthor{WikidataID: "Q7349", Name: "Johann Strauss"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res.Status != ResolveStatusCreated {
		t.Errorf("expected created, got %v", res.Status)
	}
}

func TestResolveAuthor_NewQIDNoNameMatchCreates(t *testing.T) {
	r := &fakeResolver{}
	bd := int16(1770)
	dd := int16(1827)
	res, err := ResolveAuthor(r, "user-1", WikidataAuthor{
		WikidataID: "Q255",
		Name:       "Ludwig van Beethoven",
		BirthYear:  &bd,
		DeathYear:  &dd,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res.Status != ResolveStatusCreated {
		t.Errorf("expected created, got %v", res.Status)
	}
	if res.Author.Name != "Ludwig van Beethoven" {
		t.Errorf("expected Beethoven, got %s", res.Author.Name)
	}
	if res.Author.WikidataID != "Q255" {
		t.Errorf("expected Q255, got %s", res.Author.WikidataID)
	}
	if len(r.created) != 1 {
		t.Errorf("expected 1 create, got %d", len(r.created))
	}
	if r.created[0].BirthYear == nil || *r.created[0].BirthYear != 1770 {
		t.Errorf("expected birth 1770 to be persisted, got %+v", r.created[0].BirthYear)
	}
}
