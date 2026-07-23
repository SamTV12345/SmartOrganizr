-- +goose Up
-- +goose StatementBegin
CREATE TABLE club_poll (
    id                 VARCHAR(36)  NOT NULL,
    club_id            VARCHAR(255) NOT NULL,
    question           VARCHAR(500) NOT NULL,
    created_by_user_id VARCHAR(255) NOT NULL,
    multiple_choice    TINYINT(1)   NOT NULL DEFAULT 0,
    closed             TINYINT(1)   NOT NULL DEFAULT 0,
    closes_at          DATETIME     NULL,
    created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_club_poll_club (club_id, created_at),
    CONSTRAINT fk_club_poll_club FOREIGN KEY (club_id) REFERENCES clubs (id) ON DELETE CASCADE
) COLLATE = utf8mb4_general_ci;
-- +goose StatementEnd
-- +goose StatementBegin
CREATE TABLE club_poll_option (
    id       VARCHAR(36)  NOT NULL,
    poll_id  VARCHAR(36)  NOT NULL,
    label    VARCHAR(255) NOT NULL,
    position INT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_club_poll_option_poll (poll_id, position),
    CONSTRAINT fk_cpo_poll FOREIGN KEY (poll_id) REFERENCES club_poll (id) ON DELETE CASCADE
) COLLATE = utf8mb4_general_ci;
-- +goose StatementEnd
-- +goose StatementBegin
CREATE TABLE club_poll_vote (
    poll_id    VARCHAR(36)  NOT NULL,
    option_id  VARCHAR(36)  NOT NULL,
    user_id    VARCHAR(255) NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (poll_id, option_id, user_id),
    KEY idx_cpv_option (option_id),
    CONSTRAINT fk_cpv_poll   FOREIGN KEY (poll_id)   REFERENCES club_poll (id)        ON DELETE CASCADE,
    CONSTRAINT fk_cpv_option FOREIGN KEY (option_id) REFERENCES club_poll_option (id) ON DELETE CASCADE
) COLLATE = utf8mb4_general_ci;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE club_poll_vote;
-- +goose StatementEnd
-- +goose StatementBegin
DROP TABLE club_poll_option;
-- +goose StatementEnd
-- +goose StatementBegin
DROP TABLE club_poll;
-- +goose StatementEnd
