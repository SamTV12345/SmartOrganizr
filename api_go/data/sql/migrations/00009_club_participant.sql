-- +goose Up
CREATE TABLE club_participant (
    user_id varchar(255) NOT NULL,
    club_id varchar(255) NOT NULL,
    role ENUM('LEITER','CO_LEITER', 'SCHATZMEISTER', 'MITGLIED') NOT NULL ,
    FOREIGN KEY (`user_id`)  REFERENCES user(id),
    FOREIGN KEY (`club_id`) REFERENCES clubs(id),
    PRIMARY KEY (user_id, club_id)
 ) COLLATE = utf8mb4_general_ci;