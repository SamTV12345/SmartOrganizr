-- +goose Up
-- Reminders for members who have not answered an event yet.
-- club_reminder_settings: one row per club that enabled automatic reminders
-- (hours_before = how long before the start); no row = off.
-- club_event_reminder: last reminder per member and event, so the automatic
-- job reminds once and manual reminders respect a cooldown.
-- +goose StatementBegin
CREATE TABLE club_reminder_settings (
    club_id      VARCHAR(255) NOT NULL,
    hours_before INT          NOT NULL,
    PRIMARY KEY (club_id),
    CONSTRAINT fk_crs_club FOREIGN KEY (club_id) REFERENCES clubs (id) ON DELETE CASCADE
) COLLATE = utf8mb4_general_ci;
-- +goose StatementEnd
-- +goose StatementBegin
CREATE TABLE club_event_reminder (
    event_id VARCHAR(36)  NOT NULL,
    user_id  VARCHAR(255) NOT NULL,
    sent_at  DATETIME     NOT NULL,
    PRIMARY KEY (event_id, user_id),
    CONSTRAINT fk_cer_reminder_event FOREIGN KEY (event_id) REFERENCES club_events (id) ON DELETE CASCADE
) COLLATE = utf8mb4_general_ci;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE club_event_reminder;
-- +goose StatementEnd
-- +goose StatementBegin
DROP TABLE club_reminder_settings;
-- +goose StatementEnd
