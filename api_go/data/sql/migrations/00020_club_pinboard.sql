-- +goose Up
CREATE TABLE club_pinboard_post (
    id             VARCHAR(36)  NOT NULL,
    club_id        VARCHAR(255) NOT NULL,
    author_user_id VARCHAR(255) NOT NULL,
    title          VARCHAR(500) NOT NULL,
    body           TEXT         NOT NULL,
    pinned         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY club_pinboard_club_idx (club_id, pinned, created_at),
    CONSTRAINT club_pinboard_fk_club FOREIGN KEY (club_id) REFERENCES clubs (id) ON DELETE CASCADE,
    CONSTRAINT club_pinboard_fk_author FOREIGN KEY (author_user_id) REFERENCES user (id) ON DELETE CASCADE
) COLLATE = utf8mb4_general_ci;

-- +goose Down
DROP TABLE club_pinboard_post;
