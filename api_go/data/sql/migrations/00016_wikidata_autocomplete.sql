-- +goose Up

ALTER TABLE authors
  ADD COLUMN wikidata_id VARCHAR(16) DEFAULT NULL,
  ADD COLUMN birth_year SMALLINT DEFAULT NULL,
  ADD COLUMN death_year SMALLINT DEFAULT NULL,
  ADD UNIQUE KEY uniq_author_wikidata (user_id_fk, wikidata_id);

ALTER TABLE elements
  ADD COLUMN wikidata_id VARCHAR(16) DEFAULT NULL,
  ADD COLUMN composition_year SMALLINT DEFAULT NULL,
  ADD COLUMN genre VARCHAR(255) DEFAULT NULL,
  ADD UNIQUE KEY uniq_element_wikidata (user_id_fk, wikidata_id);

ALTER TABLE elements
  ADD COLUMN composer_id_fk VARCHAR(255) DEFAULT NULL,
  ADD COLUMN arranger_id_fk VARCHAR(255) DEFAULT NULL,
  ADD KEY idx_elements_composer (composer_id_fk),
  ADD KEY idx_elements_arranger (arranger_id_fk),
  ADD CONSTRAINT elements_composer_id_fk FOREIGN KEY (composer_id_fk) REFERENCES authors(id),
  ADD CONSTRAINT elements_arranger_id_fk FOREIGN KEY (arranger_id_fk) REFERENCES authors(id);

UPDATE elements SET composer_id_fk = author_id_fk WHERE author_id_fk IS NOT NULL;

ALTER TABLE elements
  DROP FOREIGN KEY elements_author_id_fk,
  DROP COLUMN author_id_fk;

-- +goose Down

ALTER TABLE elements
  ADD COLUMN author_id_fk VARCHAR(255) DEFAULT NULL,
  ADD CONSTRAINT elements_author_id_fk FOREIGN KEY (author_id_fk) REFERENCES authors(id);

UPDATE elements SET author_id_fk = COALESCE(composer_id_fk, arranger_id_fk);

ALTER TABLE elements
  DROP FOREIGN KEY elements_composer_id_fk,
  DROP FOREIGN KEY elements_arranger_id_fk,
  DROP COLUMN composer_id_fk,
  DROP COLUMN arranger_id_fk,
  DROP COLUMN wikidata_id,
  DROP COLUMN composition_year,
  DROP COLUMN genre;

ALTER TABLE authors
  DROP COLUMN wikidata_id,
  DROP COLUMN birth_year,
  DROP COLUMN death_year;
