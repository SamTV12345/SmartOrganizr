-- +goose Up
-- Club sheet music archive (Notenarchiv): a score (Werk) has parts (Stimmen),
-- each optionally tied to an instrument section (Register). Members get the
-- part(s) of their own section; with several parts per section the member's
-- pick is remembered per score. Program entries may point at a score.
-- +goose StatementBegin
CREATE TABLE club_score (
    id         VARCHAR(36)  NOT NULL,
    club_id    VARCHAR(255) NOT NULL,
    title      VARCHAR(255) NOT NULL,
    composer   VARCHAR(255) NULL,
    arranger   VARCHAR(255) NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_club_score_club (club_id, title),
    CONSTRAINT fk_club_score_club FOREIGN KEY (club_id) REFERENCES clubs (id) ON DELETE CASCADE
) COLLATE = utf8mb4_general_ci;
-- +goose StatementEnd
-- +goose StatementBegin
CREATE TABLE club_score_part (
    id         VARCHAR(36)  NOT NULL,
    score_id   VARCHAR(36)  NOT NULL,
    name       VARCHAR(255) NOT NULL,
    section_fk VARCHAR(36)  NULL,
    position   INT          NOT NULL DEFAULT 0,
    size_bytes BIGINT       NOT NULL,
    content    LONGBLOB     NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_club_score_part_score (score_id, position),
    CONSTRAINT fk_csp_score FOREIGN KEY (score_id) REFERENCES club_score (id) ON DELETE CASCADE,
    CONSTRAINT fk_csp_section FOREIGN KEY (section_fk) REFERENCES club_section (id) ON DELETE SET NULL
) COLLATE = utf8mb4_general_ci;
-- +goose StatementEnd
-- +goose StatementBegin
CREATE TABLE club_score_part_choice (
    score_id VARCHAR(36)  NOT NULL,
    user_id  VARCHAR(255) NOT NULL,
    part_id  VARCHAR(36)  NOT NULL,
    PRIMARY KEY (score_id, user_id),
    CONSTRAINT fk_cspc_score FOREIGN KEY (score_id) REFERENCES club_score (id) ON DELETE CASCADE,
    CONSTRAINT fk_cspc_part  FOREIGN KEY (part_id)  REFERENCES club_score_part (id) ON DELETE CASCADE
) COLLATE = utf8mb4_general_ci;
-- +goose StatementEnd
-- +goose StatementBegin
ALTER TABLE club_event_program
    ADD COLUMN score_id VARCHAR(36) NULL,
    ADD CONSTRAINT fk_cep_score FOREIGN KEY (score_id) REFERENCES club_score (id) ON DELETE SET NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE club_event_program DROP FOREIGN KEY fk_cep_score, DROP COLUMN score_id;
-- +goose StatementEnd
-- +goose StatementBegin
DROP TABLE club_score_part_choice;
-- +goose StatementEnd
-- +goose StatementBegin
DROP TABLE club_score_part;
-- +goose StatementEnd
-- +goose StatementBegin
DROP TABLE club_score;
-- +goose StatementEnd
