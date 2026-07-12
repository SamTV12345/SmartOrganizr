-- +goose Up
-- Recurring club events (Serientermine): occurrences are materialized as
-- independent club_events rows that share a series_id. See the "Recurrence
-- (2026-07-12)" section in
-- docs/superpowers/specs/2026-05-29-native-club-events-design.md.
-- +goose StatementBegin
ALTER TABLE club_events
    ADD COLUMN series_id varchar(36) NULL,
    ADD KEY idx_club_events_series (series_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE club_events DROP KEY idx_club_events_series, DROP COLUMN series_id;
-- +goose StatementEnd
