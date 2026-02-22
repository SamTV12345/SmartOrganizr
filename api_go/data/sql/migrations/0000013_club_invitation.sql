-- +goose Up
CREATE TABLE club_invitation
(
    token              VARCHAR(255) NOT NULL PRIMARY KEY,
    club_id            VARCHAR(255) NOT NULL,
    invited_email      VARCHAR(500) NOT NULL,
    invited_by_user_id VARCHAR(255) NOT NULL,
    created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at         DATETIME     NOT NULL,
    accepted_at        DATETIME              DEFAULT NULL,
    FOREIGN KEY (club_id) REFERENCES clubs (id),
    FOREIGN KEY (invited_by_user_id) REFERENCES user (id)
) COLLATE = utf8mb4_general_ci;

