-- +goose Up
ALTER TABLE ical_sync ADD COLUMN last_synced timestamp;