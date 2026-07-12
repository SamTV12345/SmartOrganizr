-- +goose Up
-- "Berechtigte" (authorized members) back the leaders-and-authorized /
-- only-authorized attendance-visibility settings. Managers grant the flag
-- per member; it is independent of the role.
ALTER TABLE club_participant ADD COLUMN authorized BOOL NOT NULL DEFAULT FALSE;

-- +goose Down
ALTER TABLE club_participant DROP COLUMN authorized;
