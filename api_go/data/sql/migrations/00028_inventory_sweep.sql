-- +goose Up
-- Inventory sweeps: reconcile which physical Mappe (folder) each sheet
-- actually lives in, plus stampable per-piece inventory numbers.
-- See docs/superpowers/specs/2026-07-12-inventory-sweep-design.md.
ALTER TABLE elements ADD COLUMN inventory_no INT DEFAULT NULL;
ALTER TABLE elements ADD CONSTRAINT uniq_user_inventory_no UNIQUE (user_id_fk, inventory_no);

CREATE TABLE mappe_tag (
    tag_id     varchar(36)  NOT NULL,
    folder_fk  varchar(255) NOT NULL,
    user_fk    varchar(255) NOT NULL,
    created_at timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tag_id),
    UNIQUE KEY uniq_mappe_tag_folder (folder_fk),
    FOREIGN KEY (folder_fk) REFERENCES elements (id) ON DELETE CASCADE,
    FOREIGN KEY (user_fk) REFERENCES user (id) ON DELETE CASCADE
) COLLATE = utf8mb4_general_ci;

CREATE TABLE inventory_sweep (
    id           varchar(36)  NOT NULL,
    folder_fk    varchar(255) NOT NULL,
    user_fk      varchar(255) NOT NULL,
    started_at   timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp    NULL     DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_inventory_sweep_folder (folder_fk),
    FOREIGN KEY (folder_fk) REFERENCES elements (id) ON DELETE CASCADE,
    FOREIGN KEY (user_fk) REFERENCES user (id) ON DELETE CASCADE
) COLLATE = utf8mb4_general_ci;

CREATE TABLE inventory_sighting (
    sweep_fk    varchar(36)                 NOT NULL,
    note_fk     varchar(255)                NOT NULL,
    matched_via ENUM ('OCR','AI','MANUAL')  NOT NULL,
    confidence  tinyint                     NULL,
    incomplete  bool                        NOT NULL DEFAULT FALSE,
    created_at  timestamp                   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (sweep_fk, note_fk),
    KEY idx_inventory_sighting_note (note_fk),
    FOREIGN KEY (sweep_fk) REFERENCES inventory_sweep (id) ON DELETE CASCADE,
    FOREIGN KEY (note_fk) REFERENCES elements (id) ON DELETE CASCADE
) COLLATE = utf8mb4_general_ci;

-- +goose Down
DROP TABLE inventory_sighting;
DROP TABLE inventory_sweep;
DROP TABLE mappe_tag;
ALTER TABLE elements DROP INDEX uniq_user_inventory_no;
ALTER TABLE elements DROP COLUMN inventory_no;
