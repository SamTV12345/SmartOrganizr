-- +goose Up
-- +goose StatementBegin
CREATE TABLE ai_chat_session (
    id         VARCHAR(36)  NOT NULL,
    user_fk    VARCHAR(255) COLLATE utf8mb4_general_ci NOT NULL,
    title      VARCHAR(255) NOT NULL DEFAULT '',
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_ai_chat_session_user (user_fk, updated_at),
    CONSTRAINT fk_ai_chat_session_user FOREIGN KEY (user_fk) REFERENCES user (id) ON DELETE CASCADE
) COLLATE = utf8mb4_general_ci;
-- +goose StatementEnd
-- +goose StatementBegin
CREATE TABLE ai_chat_message (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    session_fk VARCHAR(36)  NOT NULL,
    role       VARCHAR(16)  NOT NULL,
    content    TEXT         NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_ai_chat_message_session (session_fk, created_at),
    CONSTRAINT fk_ai_chat_message_session FOREIGN KEY (session_fk) REFERENCES ai_chat_session (id) ON DELETE CASCADE
) COLLATE = utf8mb4_general_ci;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE ai_chat_message;
-- +goose StatementEnd
-- +goose StatementBegin
DROP TABLE ai_chat_session;
-- +goose StatementEnd
