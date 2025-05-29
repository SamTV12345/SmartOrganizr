-- +goose Up
CREATE TABLE events (
                        uid VARCHAR(255) NOT NULL,
                        user_id_fk VARCHAR(50) NOT NULL,
                        summary TEXT,
                        url VARCHAR(2048),
                        geo_date_x float,
                        geo_date_y float,
                        location TEXT,
                        tz_id VARCHAR(100),
                        description TEXT,
                        start_date TIMESTAMP,
                        end_date TIMESTAMP,
                        PRIMARY KEY (uid, user_id_fk)
);
