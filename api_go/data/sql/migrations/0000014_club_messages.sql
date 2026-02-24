-- +goose Up
CREATE TABLE club_chat (
    id VARCHAR(36) NOT NULL,
    club_id VARCHAR(255) NOT NULL,
    user_a_id VARCHAR(255) NOT NULL,
    user_b_id VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT club_chat_unique_pair UNIQUE (club_id, user_a_id, user_b_id),
    CONSTRAINT club_chat_fk_club FOREIGN KEY (club_id) REFERENCES clubs (id) ON DELETE CASCADE,
    CONSTRAINT club_chat_fk_user_a FOREIGN KEY (user_a_id) REFERENCES user (id) ON DELETE CASCADE,
    CONSTRAINT club_chat_fk_user_b FOREIGN KEY (user_b_id) REFERENCES user (id) ON DELETE CASCADE
) collate = utf8mb4_general_ci;

CREATE TABLE club_chat_message (
    id VARCHAR(36) NOT NULL,
    chat_id VARCHAR(36) NOT NULL,
    sender_user_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY club_chat_message_chat_idx (chat_id, created_at),
    CONSTRAINT club_chat_message_fk_chat FOREIGN KEY (chat_id) REFERENCES club_chat (id) ON DELETE CASCADE,
    CONSTRAINT club_chat_message_fk_sender FOREIGN KEY (sender_user_id) REFERENCES user (id) ON DELETE CASCADE
) collate = utf8mb4_general_ci;
