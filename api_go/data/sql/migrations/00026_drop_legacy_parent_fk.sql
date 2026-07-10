-- +goose Up
-- elements.parent carries two FKs to elements.id: the legacy non-cascading
-- elements_parent_id_fk (00001) and the cascading FK9dge740kie6d93toyhowlnn1o
-- (00010). MySQL enforces the stricter one, so deleting a non-empty folder
-- has always failed with FK error 1451. Drop the legacy constraint.
ALTER TABLE elements DROP FOREIGN KEY elements_parent_id_fk;

-- +goose Down
ALTER TABLE elements
    ADD CONSTRAINT elements_parent_id_fk FOREIGN KEY (parent) REFERENCES elements (id);
