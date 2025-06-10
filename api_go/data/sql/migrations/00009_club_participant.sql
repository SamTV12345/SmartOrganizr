CREATE TABLE club_participant (
    user_id varchar(255) NOT NULL,
    club_id varchar(255) NOT NULL,
    role ENUM('LEITER','CO_LEITER', 'SCHATZMEISTER', 'MITGLIED')
 )