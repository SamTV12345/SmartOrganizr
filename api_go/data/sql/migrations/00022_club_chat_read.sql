-- +goose Up
CREATE TABLE club_chat_read (
    chat_id      VARCHAR(36)  NOT NULL,
    user_id      VARCHAR(255) NOT NULL,
    last_read_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (chat_id, user_id),
    CONSTRAINT club_chat_read_fk_chat FOREIGN KEY (chat_id) REFERENCES club_chat (id) ON DELETE CASCADE,
    CONSTRAINT club_chat_read_fk_user FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE
) COLLATE = utf8mb4_general_ci;

-- +goose Down
DROP TABLE club_chat_read;
