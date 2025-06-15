-- +goose Up
CREATE TABLE club_participant (
    user_id varchar(255) NOT NULL,
    club_id varchar(255) NOT NULL,
    role ENUM('LEITER','CO_LEITER', 'SCHATZMEISTER', 'MITGLIED'),
    PRIMARY KEY (user_id, club_id)
 );