-- +goose Up
ALTER TABLE user
    ADD COLUMN ical_feed_token VARCHAR(64) NULL,
    ADD UNIQUE KEY uniq_user_ical_feed_token (ical_feed_token);

-- +goose Down
ALTER TABLE user
    DROP KEY uniq_user_ical_feed_token,
    DROP COLUMN ical_feed_token;
