-- +goose Up
CREATE TABLE IF NOT EXISTS ical_sync (
                           id varchar(48) NOT NULL,
                            `user_id_fk` varchar(255) NOT NULL,
                           ical_url varchar(500) NOT NULL,
                            type varchar(20) NOT NULL,
                           PRIMARY KEY (id)
)  ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE ical_sync
    ADD CONSTRAINT FK_ical_sync_user FOREIGN KEY (user_id_fk) REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE;