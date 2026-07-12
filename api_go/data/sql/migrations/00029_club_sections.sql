-- +goose Up
-- Instrument sections (Register) per club, section leaders and
-- section-targeted events. See
-- docs/superpowers/specs/2026-07-12-club-sections-design.md.
-- +goose StatementBegin
CREATE TABLE club_section (
    id      varchar(36)  NOT NULL,
    club_id varchar(255) NOT NULL,
    name    varchar(255) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uniq_club_section_name (club_id, name),
    CONSTRAINT fk_club_section_club FOREIGN KEY (club_id) REFERENCES clubs (id) ON DELETE CASCADE
) COLLATE = utf8mb4_general_ci;
-- +goose StatementEnd
-- +goose StatementBegin
ALTER TABLE club_participant
    ADD COLUMN section_fk varchar(36) NULL,
    ADD COLUMN section_leader bool NOT NULL DEFAULT FALSE,
    ADD CONSTRAINT fk_club_participant_section FOREIGN KEY (section_fk) REFERENCES club_section (id) ON DELETE SET NULL;
-- +goose StatementEnd
-- +goose StatementBegin
ALTER TABLE club_events
    ADD COLUMN section_fk varchar(36) NULL,
    ADD CONSTRAINT fk_club_events_section FOREIGN KEY (section_fk) REFERENCES club_section (id) ON DELETE SET NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE club_events DROP FOREIGN KEY fk_club_events_section, DROP COLUMN section_fk;
-- +goose StatementEnd
-- +goose StatementBegin
ALTER TABLE club_participant DROP FOREIGN KEY fk_club_participant_section, DROP COLUMN section_fk, DROP COLUMN section_leader;
-- +goose StatementEnd
-- +goose StatementBegin
DROP TABLE club_section;
-- +goose StatementEnd
