-- +goose Up
ALTER TABLE elements
    ADD CONSTRAINT FK9dge740kie6d93toyhowlnn1o FOREIGN KEY (parent) REFERENCES elements(id) ON DELETE CASCADE;
-- +goose Down
ALTER TABLE elements
    DROP FOREIGN KEY FK9dge740kie6d93toyhowlnn1o;