-- +goose Up

-- Same work in two different folders is a legitimate use case (e.g. an
-- original score and a transposed copy, or the same piece in different
-- concert programs). Only authors benefit from per-user-QID uniqueness.
ALTER TABLE elements DROP INDEX uniq_element_wikidata;
CREATE INDEX idx_elements_wikidata ON elements (user_id_fk, wikidata_id);

-- +goose Down

DROP INDEX idx_elements_wikidata ON elements;
ALTER TABLE elements ADD UNIQUE KEY uniq_element_wikidata (user_id_fk, wikidata_id);
