-- +goose Up
CREATE TABLE `authors` (
                           `id` varchar(255) NOT NULL,
    `extra_information` varchar(255) DEFAULT NULL,
    `name` varchar(255) DEFAULT NULL,
    `user_id_fk` varchar(255) DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `authors_seq` (
                               `next_val` bigint(20) DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Daten für Tabelle `authors_seq`
--

INSERT INTO `authors_seq` (`next_val`) VALUES
    (1);

CREATE TABLE `concert` (
                           `id` varchar(255) NOT NULL,
    `description` varchar(255) DEFAULT NULL,
    `due_date` datetime DEFAULT NULL,
    `hints` text DEFAULT NULL,
    `location` varchar(255) DEFAULT NULL,
    `title` varchar(255) DEFAULT NULL,
    `user_id_fk` varchar(255) DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `elements` (
                            `type` varchar(31) NOT NULL,
    `id` varchar(255) NOT NULL,
    `creation_date` datetime DEFAULT NULL,
    `description` varchar(255) DEFAULT NULL,
    `name` varchar(255) DEFAULT NULL,
    `number_of_pages` int(11) DEFAULT NULL,
    `title` varchar(255) DEFAULT NULL,
    `user_id_fk` varchar(255) DEFAULT NULL,
    `parent` varchar(255) DEFAULT NULL,
    `author_id_fk` varchar(255) DEFAULT NULL,
    `pdf_content` longblob DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `note_in_concert` (
                                   `concert_id_fk` varchar(255) NOT NULL,
    `note_id_fk` varchar(255) NOT NULL,
    `place_in_concert` int(11) DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `user` (
                        `id` varchar(255) NOT NULL,
    `selected_theme` varchar(255) DEFAULT NULL,
    `side_bar_collapsed` boolean NOT NULL,
    `username` varchar(255) DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `authors`
    ADD PRIMARY KEY (`id`),
    ADD KEY `FKl3fvy5sfb7c0c7om0c7hwpxc4` (`user_id_fk`);

ALTER TABLE `elements`
    ADD PRIMARY KEY (`id`),
    ADD KEY `FKd8vh3jac37jvfu6ab0gcfvqs5` (`user_id_fk`),
    ADD KEY `FK9dge740kie6d93toyhowlnn1o` (`parent`),
    ADD KEY `FK8g6l9fmc6yy019aakny0epevk` (`author_id_fk`);

--
-- Indizes für die Tabelle `note_in_concert`
--
ALTER TABLE `note_in_concert`
    ADD PRIMARY KEY (`concert_id_fk`,`note_id_fk`),
    ADD UNIQUE KEY `UK74vdfxnw5lfuxgxpb9x18ugcn` (`note_id_fk`,`concert_id_fk`,`place_in_concert`);

ALTER TABLE `user`
    ADD PRIMARY KEY (`id`);

--
-- Constraints der Tabelle `authors`
--
ALTER TABLE `authors`
    ADD CONSTRAINT `FKl3fvy5sfb7c0c7om0c7hwpxc4` FOREIGN KEY (`user_id_fk`) REFERENCES `user` (`id`);

--
-- Constraints der Tabelle `concert`
--
ALTER TABLE `concert`
    ADD CONSTRAINT `FK5wexqlvcj6jturp80sbm0vbjl` FOREIGN KEY (`user_id_fk`) REFERENCES `user` (`id`);

--
-- Constraints der Tabelle `elements`
--
ALTER TABLE `elements`
    ADD CONSTRAINT `FK8g6l9fmc6yy019aakny0epevk` FOREIGN KEY (`author_id_fk`) REFERENCES `authors` (`id`),
    ADD CONSTRAINT `FK9dge740kie6d93toyhowlnn1o` FOREIGN KEY (`parent`) REFERENCES `elements` (`id`),
    ADD CONSTRAINT `FKd8vh3jac37jvfu6ab0gcfvqs5` FOREIGN KEY (`user_id_fk`) REFERENCES `user` (`id`);

--
-- Constraints der Tabelle `note_in_concert`
--
ALTER TABLE `note_in_concert`
    ADD CONSTRAINT `FKh5pidxupafwqp2brhepxsr2h3` FOREIGN KEY (`note_id_fk`) REFERENCES `elements` (`id`),
    ADD CONSTRAINT `FKkp2eiiuyydlfmp5mf42i4sp60` FOREIGN KEY (`concert_id_fk`) REFERENCES `concert` (`id`);
COMMIT;