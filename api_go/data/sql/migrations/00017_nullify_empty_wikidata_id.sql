-- +goose Up

-- Earlier code wrote empty-string wikidata_id values into rows without a
-- Wikidata link. MySQL's UNIQUE constraint treats '' as a real value, so a
-- second authorless row collided with the first. Normalize them to NULL,
-- which the UNIQUE check ignores.
UPDATE authors  SET wikidata_id = NULL WHERE wikidata_id = '';
UPDATE elements SET wikidata_id = NULL WHERE wikidata_id = '';

-- +goose Down

-- No-op: we can't tell which NULLs were '' before, and '' was the wrong
-- value in the first place. Re-applying Up is idempotent.
SELECT 1;
