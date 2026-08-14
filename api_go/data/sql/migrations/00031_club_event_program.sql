-- +goose Up
-- +goose StatementBegin
CREATE TABLE club_event_program (
    id               VARCHAR(36)  NOT NULL,
    event_id         VARCHAR(36)  NOT NULL,
    note_id          VARCHAR(255) NULL,
    title            VARCHAR(255) NOT NULL,
    position         INT          NOT NULL DEFAULT 0,
    duration_minutes INT          NULL,
    note_text        VARCHAR(500) NULL,
    PRIMARY KEY (id),
    KEY idx_cep_event_position (event_id, position),
    -- note_id is nullable so deleting a library note keeps the (denormalized-title) program row.
    CONSTRAINT fk_cep_event FOREIGN KEY (event_id) REFERENCES club_events (id) ON DELETE CASCADE,
    CONSTRAINT fk_cep_note FOREIGN KEY (note_id) REFERENCES elements (id) ON DELETE SET NULL
) COLLATE = utf8mb4_general_ci;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE club_event_program;
-- +goose StatementEnd
