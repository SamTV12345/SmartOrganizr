-- +goose Up
-- +goose StatementBegin
CREATE TABLE club_events (
    id                 VARCHAR(36)  NOT NULL,
    club_id            VARCHAR(255) NOT NULL,
    summary            VARCHAR(255) NOT NULL,
    description        TEXT         NULL,
    location           VARCHAR(255) NULL,
    geo_date_x         DOUBLE       NULL,
    geo_date_y         DOUBLE       NULL,
    event_type         VARCHAR(32)  NOT NULL DEFAULT 'REHEARSAL',
    start_date         DATETIME     NOT NULL,
    end_date           DATETIME     NULL,
    cancelled          TINYINT(1)   NOT NULL DEFAULT 0,
    created_by_user_id VARCHAR(255) NOT NULL,
    created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_club_events_club_start (club_id, start_date),
    CONSTRAINT fk_club_events_club FOREIGN KEY (club_id) REFERENCES clubs (id) ON DELETE CASCADE
) COLLATE = utf8mb4_general_ci;
-- +goose StatementEnd
-- +goose StatementBegin
CREATE TABLE club_event_response (
    event_id     VARCHAR(36)  NOT NULL,
    user_id      VARCHAR(255) NOT NULL,
    status       VARCHAR(16)  NOT NULL,
    reason       VARCHAR(500) NULL,
    responded_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, user_id),
    CONSTRAINT fk_cer_event FOREIGN KEY (event_id) REFERENCES club_events (id) ON DELETE CASCADE
) COLLATE = utf8mb4_general_ci;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE club_event_response;
-- +goose StatementEnd
-- +goose StatementBegin
DROP TABLE club_events;
-- +goose StatementEnd
