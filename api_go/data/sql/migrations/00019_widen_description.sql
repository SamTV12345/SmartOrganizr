-- +goose Up

-- description was VARCHAR(255). AI-sourced notes can easily exceed that
-- (Pixtral's medley descriptions are 300-500 chars), and in MySQL's STRICT
-- mode the INSERT fails outright; in non-strict mode it silently truncates.
-- TEXT gives 64 KB which is plenty for any human-written description.
ALTER TABLE elements MODIFY description TEXT DEFAULT NULL;
ALTER TABLE concert  MODIFY description VARCHAR(2000) DEFAULT NULL;

-- +goose Down

ALTER TABLE elements MODIFY description VARCHAR(255) DEFAULT NULL;
ALTER TABLE concert  MODIFY description VARCHAR(255) DEFAULT NULL;
