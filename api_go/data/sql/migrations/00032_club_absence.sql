-- +goose Up
-- +goose StatementBegin
CREATE TABLE club_absence (
    id         VARCHAR(36)  NOT NULL,
    club_id    VARCHAR(255) NOT NULL,
    user_id    VARCHAR(255) NOT NULL,
    start_date DATE         NOT NULL,
    end_date   DATE         NOT NULL,
    reason     VARCHAR(500) NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_club_absence_club_user (club_id, user_id),
    KEY idx_club_absence_range (club_id, start_date, end_date),
    CONSTRAINT fk_club_absence_club FOREIGN KEY (club_id) REFERENCES clubs (id) ON DELETE CASCADE,
    CONSTRAINT fk_club_absence_user FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE
) COLLATE = utf8mb4_general_ci;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE club_absence;
-- +goose StatementEnd
