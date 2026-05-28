-- +goose Up
CREATE TABLE club_file (
    id                  VARCHAR(36)  NOT NULL,
    club_id             VARCHAR(255) NOT NULL,
    name                VARCHAR(500) NOT NULL,
    mime_type           VARCHAR(255) NOT NULL,
    size_bytes          BIGINT       NOT NULL,
    content             LONGBLOB     NOT NULL,
    uploaded_by_user_id VARCHAR(255) NOT NULL,
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY club_file_club_idx (club_id, created_at),
    CONSTRAINT club_file_fk_club FOREIGN KEY (club_id) REFERENCES clubs (id) ON DELETE CASCADE,
    CONSTRAINT club_file_fk_uploader FOREIGN KEY (uploaded_by_user_id) REFERENCES user (id) ON DELETE CASCADE
) COLLATE = utf8mb4_general_ci;

-- +goose Down
DROP TABLE club_file;
