-- +goose Up

CREATE TABLE address(
                        id VARCHAR(255) NOT NULL PRIMARY KEY,
                        street VARCHAR(255) NOT NULL,
                        house_number VARCHAR(255) NOT NULL,
                        location VARCHAR(255) NOT NULL,
                        postal_code VARCHAR(255) NOT NULL,
                        country VARCHAR(255) NOT NULL
);

CREATE TABLE clubs (
    id VARCHAR(255) NOT NULL PRIMARY KEY ,
    name VARCHAR(255) NOT NULL,
    address_id VARCHAR(255) NOT NULL REFERENCES address(id)
);


