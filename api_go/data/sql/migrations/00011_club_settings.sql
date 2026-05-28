-- +goose Up
ALTER TABLE clubs
    ADD COLUMN club_type VARCHAR(255) NOT NULL DEFAULT 'musikverein',
    ADD COLUMN dates_visible_for_all_members BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN members_can_send_messages BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN feedback_visibility VARCHAR(255) NOT NULL DEFAULT 'leaders-and-authorized',
    ADD COLUMN reason_visibility VARCHAR(255) NOT NULL DEFAULT 'leaders-and-authorized',
    ADD COLUMN confirmed_representative BOOLEAN NOT NULL DEFAULT FALSE;

