# Autocomplete für Werke und Autoren mit Wikidata-Anreicherung

**Datum:** 2026-05-24
**Status:** Design

## Ziel

Beim Anlegen eines Werks soll der User per debounced Live-Autocomplete sowohl Vorschläge aus seinem eigenen Bestand als auch aus Wikidata sehen. Beim Übernehmen eines Wikidata-Vorschlags werden Metadaten (Beschreibung, Entstehungsjahr, Genre) und der Autor (Composer und/oder Arranger) automatisch befüllt. Autoren werden über die Wikidata-QID dedupliziert, sodass gleichnamige aber unterschiedliche Personen sauber getrennt bleiben.

## Nicht-Ziele

- Wikidata vollständig spiegeln oder einen kuratierten Katalog importieren
- Bulk-Import existierender Bestände gegen Wikidata
- Caching der Wikidata-Antworten (kann später ergänzt werden, wenn Performance ein Problem wird)
- Automatische Verlinkung Composer↔Arranger (z.B. „Du legst ein Arrangement an — welches Originalwerk?")

## Modellierung: Composer vs. Arranger

Aktuell hat `elements` genau ein `author_id_fk`. Das wird ersetzt durch **zwei optionale** Fremdschlüssel:

- `composer_id_fk` — der Komponist des Originalwerks (z.B. Andersson/Ulvaeus, Beethoven)
- `arranger_id_fk` — der Arrangeur (z.B. Robert Sebregts für "Abba Gold" Blasmusik-Arrangement)

Bei reiner Klassik bleibt `arranger_id_fk` leer. Bei Blasmusik-Arrangements ohne dokumentierten Composer bleibt `composer_id_fk` leer. Der User kann beide setzen — das ist die saubere Repräsentation für "Abba Gold von Sebregts" (Composer: ABBA/Andersson, Arranger: Sebregts), aber nicht erzwungen.

## Schema-Änderungen

Neue Migration `0000016_wikidata_autocomplete.sql`:

```sql
-- +goose Up

-- Autoren um Wikidata-Anreicherung erweitern
ALTER TABLE authors
  ADD COLUMN wikidata_id VARCHAR(16) DEFAULT NULL,
  ADD COLUMN birth_year SMALLINT DEFAULT NULL,
  ADD COLUMN death_year SMALLINT DEFAULT NULL,
  ADD UNIQUE KEY uniq_author_wikidata (user_id_fk, wikidata_id);
-- extra_information bleibt für freie Disambig-Notizen unverändert

-- Werke um Wikidata-Anreicherung erweitern
ALTER TABLE elements
  ADD COLUMN wikidata_id VARCHAR(16) DEFAULT NULL,
  ADD COLUMN composition_year SMALLINT DEFAULT NULL,
  ADD COLUMN genre VARCHAR(255) DEFAULT NULL,
  ADD UNIQUE KEY uniq_element_wikidata (user_id_fk, wikidata_id);

-- Composer/Arranger trennen
ALTER TABLE elements
  ADD COLUMN composer_id_fk VARCHAR(255) DEFAULT NULL,
  ADD COLUMN arranger_id_fk VARCHAR(255) DEFAULT NULL,
  ADD KEY idx_elements_composer (composer_id_fk),
  ADD KEY idx_elements_arranger (arranger_id_fk),
  ADD CONSTRAINT elements_composer_id_fk FOREIGN KEY (composer_id_fk) REFERENCES authors(id),
  ADD CONSTRAINT elements_arranger_id_fk FOREIGN KEY (arranger_id_fk) REFERENCES authors(id);

-- Bestandsdaten migrieren: bestehender author_id_fk wird zu composer_id_fk
UPDATE elements SET composer_id_fk = author_id_fk WHERE author_id_fk IS NOT NULL;

-- Alten FK entfernen
ALTER TABLE elements
  DROP FOREIGN KEY elements_author_id_fk,
  DROP COLUMN author_id_fk;
```

Beschreibung (`description` Feld) und Name (`name` Feld) existieren bereits auf `elements` — sie werden bei Wikidata-Übernahme befüllt, keine Schema-Änderung nötig.

## Query-Migration

Die folgenden Queries in `query.sql` joinen heute über `author_id_fk` und müssen angepasst werden:

- `FindAllNotesByAuthor` — muss matchen, wenn die Person als **Composer ODER Arranger** verknüpft ist (`WHERE composer_id_fk = ? OR arranger_id_fk = ?`)
- `FindAllSubElements`, `FindAllNotesByCreator`, `FindAllNotesByCreatorPaged`, `FindAllNotesByCreatorWithSearch`, `FindAllNotesByCreatorPagedWithSearch` — `JOIN authors ON elements.author_id_fk = authors.id` wird zu zwei `LEFT JOIN`s (Composer und Arranger), damit Werke ohne Autor nicht herausfallen
- Alle Create/Update-Statements für `elements` — `author_id_fk` Spalte ersetzen durch `composer_id_fk` und `arranger_id_fk`

Im Go-Backend muss der Code, der diese Queries konsumiert, auf die zwei nullable Autor-Felder angepasst werden (DTOs, Repository, Service-Layer).

## Backend-Endpoints

### `GET /api/v1/autocomplete/works?q=<term>` (neu)

Debounced vom Frontend aufgerufen, ~300ms nach letztem Tastenanschlag. Antwort:

```json
{
  "local": [
    { "id": "uuid", "name": "Armenian Dances Part I", "composer": {...}, "arranger": {...} }
  ],
  "external": [
    {
      "wikidata_id": "Q4791234",
      "name": "Armenian Dances",
      "description": "suite for concert band by Alfred Reed",
      "composition_year": 1972,
      "genre": "concert band suite",
      "composer": {
        "wikidata_id": "Q371953",
        "name": "Alfred Reed",
        "description": "American composer (1921–2005)",
        "birth_year": 1921,
        "death_year": 2005
      }
    }
  ]
}
```

Backend führt parallel aus:
- Lokale Suche: `SELECT ... FROM elements WHERE user_id_fk = ? AND name LIKE ? LIMIT 10`
- Wikidata SPARQL gegen `https://query.wikidata.org/sparql` mit gesetztem User-Agent (`SmartOrganizr/1.0`)

### `GET /api/v1/autocomplete/authors?q=<term>` (neu)

Analoger Endpoint für reines Autor-Autocomplete (wenn der User direkt im Autor-Feld tippt, ohne über ein Werk eingestiegen zu sein). Sucht lokal in `authors` und in Wikidata nach Personen mit Rolle Composer/Arranger/Performer.

### `POST /api/v1/works/from-wikidata` (neu)

Body: `{ "wikidata_id": "Q4791234" }`

Backend-Flow:
1. Werk-Detail von Wikidata holen: Label, Description, P86 (composer), P571 (inception/Entstehungsjahr) mit Fallback P577 (publication date), P136 (genre)
2. Autor-Resolution (siehe Sektion unten)
3. `elements` anlegen mit `composer_id_fk` aus Schritt 2 und Wikidata-Metadaten
4. Antwort: vollständiges Werk-Objekt mit eingebettetem Composer (Arranger bleibt leer, vom User manuell ergänzbar)

Bei Konflikt (siehe Autor-Resolution) → Status 409 mit Konflikt-Payload statt Anlage.

## Autor-Resolution beim Übernehmen eines Wikidata-Werks

Eingabe: Wikidata-QID des Composers (z.B. aus P86).

```
1. SELECT * FROM authors WHERE user_id_fk = ? AND wikidata_id = ?
   → Treffer? Author wiederverwenden, fertig.

2. SELECT * FROM authors WHERE user_id_fk = ? AND name = ? AND wikidata_id IS NULL
   → Genau ein Treffer? → KONFLIKT (409 an Frontend, User entscheidet)
   → Mehrere Treffer? → KONFLIKT (alle als Kandidaten zurückgeben)

3. Sonst: neuen Author anlegen mit Wikidata-Daten (name, wikidata_id, birth_year, death_year)
```

### Composer vs. Performer bei Wikidata-Werken

Wikidata liefert für ein Werk verschiedene mögliche "Personen-Rollen":

- **P86 (composer)** — Standard bei Klassik, auch bei Pop-Songs (z.B. Andersson/Ulvaeus bei ABBA-Songs)
- **P175 (performer)** — die ausführenden Künstler/Bands (z.B. ABBA bei "Dancing Queen")
- **P50 (author)** — bei literarischen Werken

Backend wählt in dieser Priorität: P86 → P50 → P175. Bei mehreren Composern wird der erste verwendet, weitere werden in `extra_information` des Authors als Notiz abgelegt (z.B. "Co-composed with Björn Ulvaeus").

## Konflikt-Dialog im Frontend

Wenn Backend einen 409-Konflikt zurückgibt:

```
409 Body:
{
  "incoming": { "wikidata_id": "Q7349", "name": "Johann Strauss", "description": "Austrian composer (1825–1899)" },
  "candidates": [
    { "id": "local-uuid", "name": "Johann Strauss", "extra_information": "" }
  ]
}
```

Frontend zeigt Dialog:

> Du hast bereits einen Autor namens **Johann Strauss** angelegt. Ist das derselbe wie *Johann Strauss (1825–1899), österreichischer Komponist*?
>
> [Verknüpfen] [Als neuen Autor anlegen] [Abbrechen]

- **Verknüpfen** → `PATCH /authors/{id}` mit der QID, dann Werk-Anlage erneut auslösen
- **Als neuen Autor anlegen** → `POST /works/from-wikidata` mit `force_new_author: true`; beide Autoren bekommen Disambig-Hinweis in `extra_information` (Lebensdaten, falls vorhanden)
- **Abbrechen** → User legt Werk manuell ohne Wikidata-Verknüpfung an

## Frontend-Komponente

Die existierende "Werk anlegen"-Maske bekommt:

- **Name-Feld** mit Autocomplete-Dropdown, zweigeteilt: oben "Aus meiner Sammlung" (lokal), unten "Aus Wikidata" (mit kleinem Wikidata-Icon `<img>` oder Lucide-Icon)
- Bei Auswahl eines Wikidata-Eintrags: Composer-Feld, Beschreibung, Entstehungsjahr und Genre werden automatisch befüllt; Arranger bleibt leer
- Bei Auswahl eines lokalen Eintrags: alle Felder werden aus dem existierenden Record gefüllt
- **Composer-** und **Arranger-Feld** haben jeweils ihr eigenes Autocomplete (lokale + Wikidata-Suche)
- Wikidata-verknüpfte Einträge in Listen bekommen ein kleines Icon als visuelle Markierung, damit auf einen Blick erkennbar ist, was angereichert ist

Debouncing: 300ms im Frontend nach letztem Tastenanschlag, gemeinsame Request-Cancellation wenn der User weitertippt.

## Wikidata-SPARQL-Queries

**Werk-Suche** (per Label/Alias, mit Composer):

```sparql
SELECT ?work ?workLabel ?workDescription ?composer ?composerLabel ?year ?genreLabel WHERE {
  ?work rdfs:label|skos:altLabel ?label.
  FILTER(CONTAINS(LCASE(?label), LCASE("<term>"))).
  ?work wdt:P31/wdt:P279* wd:Q2188189 .  # instance of musical work
  OPTIONAL { ?work wdt:P86 ?composer. }
  OPTIONAL { ?work wdt:P571 ?inception. BIND(YEAR(?inception) AS ?inceptionYear) }
  OPTIONAL { ?work wdt:P577 ?pubDate. BIND(YEAR(?pubDate) AS ?pubYear) }
  BIND(COALESCE(?inceptionYear, ?pubYear) AS ?year)
  OPTIONAL { ?work wdt:P136 ?genre. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en". }
}
LIMIT 10
```

**Autor-Suche** (Personen mit Composer/Arranger-Rolle):

```sparql
SELECT ?person ?personLabel ?personDescription ?birth ?death WHERE {
  ?person rdfs:label|skos:altLabel ?label.
  FILTER(CONTAINS(LCASE(?label), LCASE("<term>"))).
  ?person wdt:P106 ?occupation .
  VALUES ?occupation { wd:Q36834 wd:Q486748 wd:Q488205 } # composer, arranger, lyricist
  OPTIONAL { ?person wdt:P569 ?birth. }
  OPTIONAL { ?person wdt:P570 ?death. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en". }
}
LIMIT 10
```

HTTP-Header bei allen Wikidata-Requests:
- `User-Agent: SmartOrganizr/1.0 (kontakt@example.com)` — Pflicht, sonst 403
- `Accept: application/sparql-results+json`

Timeouts: 5s Frontend → Backend, 10s Backend → Wikidata. Bei Wikidata-Fehler: lokale Antwort allein zurückgeben, externe als leeres Array.

## Fehlerbehandlung

- **Wikidata nicht erreichbar / Timeout** → lokale Vorschläge trotzdem ausliefern, `external: []`. Log-Warning, keine User-Fehlermeldung.
- **SPARQL-Syntaxfehler / 4xx** → wie oben, logged + lokal-only Antwort.
- **Rate-Limit (429)** → kurzer Backoff (1s), bei wiederholtem 429 für diesen User 5min Cooldown auf externe Anfragen.

## Testing

- **Unit**: Autor-Resolution-Logik (alle drei Pfade: QID-Match, Name-Konflikt, neu).
- **Unit**: SPARQL-Response-Parsing mit gemockten Wikidata-Antworten.
- **Integration**: End-to-End Flow `GET /autocomplete/works` → `POST /works/from-wikidata` → Werk in DB inkl. korrekt verknüpftem Composer.
- **Integration**: Konflikt-Flow (409 wird ausgelöst, force_new_author legt zwei getrennte Autoren an).
- **Manuell**: einmal mit echtem Wikidata-Endpoint gegen "Armenian Dances" und "Dancing Queen" testen, dass Composer-Vorschlag plausibel ist.

## Offene Punkte für später (nicht in diesem Spec)

- **Wikidata-Cache**: lokale Tabelle als TTL-Cache vor SPARQL-Anfragen, falls Latenz/Rate-Limit zum Problem werden
- **Bulk-Anreicherung**: bestehende Autoren/Werke nachträglich gegen Wikidata matchen lassen
- **Arranger-Wikidata-Integration für Blasmusik**: aktuell deckt Wikidata Blasmusik-Arrangeure schlecht ab; ggf. später eigener Seed oder Verlags-API
- **Mehrere Composer pro Werk** (M:N): wenn der "Co-composed with"-Workaround in `extra_information` zu limitierend wird
