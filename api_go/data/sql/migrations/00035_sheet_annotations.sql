-- +goose Up
-- Per-player annotations on sheet music (pen strokes, highlights, text notes).
-- pdf_key addresses the PDF: a library note id or "part:<club>:<score>:<part>".
-- data is an opaque JSON document owned by the client; rows are private to user_id.
-- +goose StatementBegin
CREATE TABLE sheet_annotation (
    user_id    VARCHAR(255) NOT NULL,
    pdf_key    VARCHAR(255) NOT NULL,
    page       INT          NOT NULL,
    data       MEDIUMTEXT   NOT NULL,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, pdf_key, page),
    CONSTRAINT fk_sheet_annotation_user FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE
) COLLATE = utf8mb4_general_ci;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE sheet_annotation;
-- +goose StatementEnd
