-- name: FindAllAuthorsByCreator :many
SELECT * FROM authors
WHERE user_id_fk = ? ORDER BY name LIMIT ? OFFSET ?;

-- name: CountFindAllAuthorsByCreator :one
SELECT COUNT(*) FROM authors
WHERE user_id_fk = ?;

-- name: FindAllAuthorsByCreatorUnpaged :many
SELECT * FROM authors WHERE user_id_fk = ? ORDER BY name;


-- name: FindAllAuthorsByCreatorAndSearchText :many
SELECT a.*
FROM authors a
WHERE a.user_id_fk = ?
  AND (a.name LIKE CONCAT('%', ?, '%')
    OR a.extra_information LIKE CONCAT('%', ?, '%'));

-- name: CountFindAllAuthorsByCreatorAndSearchText :one
SELECT COUNT(*)
FROM authors a
WHERE a.user_id_fk = ?
  AND (a.name LIKE CONCAT('%', ?, '%')
    OR a.extra_information LIKE CONCAT('%', ?, '%'));

-- name: GetIndexAuthorsOnPage :many
SELECT COUNT(*) FROM authors a WHERE a.name<? ORDER BY a.name,a.id;

-- name: FindAuthorById :one
SELECT * FROM authors WHERE id = ? and user_id_fk = ?;

-- name: UpdateAuthor :exec
UPDATE authors SET name = ?, extra_information = ? WHERE id = ? AND user_id_fk = ?;

-- name: DeleteAuthor :exec
DELETE FROM authors WHERE id = ? AND user_id_fk = ?;

-- name: CreateAuthor :execlastid
INSERT INTO authors (id, name, extra_information, user_id_fk) VALUES (?, ?, ?, ?);


-- name: FindUserById :one
SELECT * FROM user WHERE id = ?;




-- name: FindAllNotesByAuthor :many
SELECT * FROM elements WHERE type ='note' AND author_id_fk = ? AND user_id_fk = ? ORDER BY name;


-- name: CreateUser :execlastid
INSERT INTO user (id, username, side_bar_collapsed, firstname, lastname ) VALUES (?, ?, ?, ?, ?);

-- name: UpdateUser :exec
UPDATE user SET username = ?, side_bar_collapsed = ?, email = ?, firstname = ?, lastname = ?, telephoneNumber = ?  WHERE id = ?;

-- name: UpdateUserProfilePicture :exec
UPDATE user SET profile_picture = ? WHERE id = ?;

-- name: DeleteProfilePicture :exec
UPDATE user SET profile_picture = NULL WHERE id = ?;

-- name: FindAllFoldersByCreator :many
-- type: Folder
SELECT * FROM elements as folders WHERE type ='folder' AND user_id_fk = ? ORDER BY name;


-- name: FindAllSubElements :many
SELECT sqlc.embed(elements), authors.* FROM elements LEFT JOIN authors ON elements.author_id_fk = authors.id WHERE parent = ? AND elements.user_id_fk = ? ORDER BY elements.name;

-- name: FindAllNotesByCreatorPaged :many
SELECT sqlc.embed(note), sqlc.embed(a), sqlc.embed(p) FROM elements as note JOIN authors a on a.id = note.author_id_fk JOIN elements p ON p.id = note.parent WHERE note.type ='note' AND a.user_id_fk = ? ORDER BY note.name LIMIT ? OFFSET ?;

-- name: FindAllNotesByCreator :many
SELECT sqlc.embed(note), sqlc.embed(a), sqlc.embed(p) FROM elements as note JOIN authors a on a.id = elements.author_id_fk JOIN elements p ON p.id = elements.parent  WHERE elements.type ='note' AND a.user_id_fk = ? ORDER BY note.name;

-- name: CountFindAllNotesByCreator :one
SELECT COUNT(*) FROM elements as note WHERE note.type ='note' AND note.user_id_fk = ?;

-- name: FindAllNotesByCreatorPagedWithSearch :many
SELECT sqlc.embed(note), sqlc.embed(a), sqlc.embed(p) FROM elements as note JOIN authors a on a.id = note.author_id_fk JOIN elements p ON p.id = note.parent WHERE note.type ='note' and note.name LIKE CONCAT('%',?,'%') AND a.user_id_fk = ? ORDER BY note.name LIMIT ? OFFSET ?;

-- name: FindAllNotesByCreatorWithSearch :many
SELECT sqlc.embed(note), sqlc.embed(a), sqlc.embed(p) FROM elements as note JOIN authors a on a.id = elements.author_id_fk JOIN elements p ON p.id = elements.parent  WHERE elements.type ='note' and note.name LIKE CONCAT('%',?,'%') AND a.user_id_fk = ? ORDER BY note.name;

-- name: CountFindAllNotesByCreatorWithSearch :one
SELECT COUNT(*) FROM elements as note WHERE note.type ='note' and note.name LIKE CONCAT('%',?,'%') AND note.user_id_fk = ?;

-- name: FindNoteById :one
-- type: Note
SELECT sqlc.embed(note),sqlc.embed(folder) FROM elements note join elements folder ON note.parent = folder.id  WHERE note.type ='note' AND note.id = ?;

-- name: FindConcertById :one
SELECT * FROM concert WHERE id = ?;

-- name: FindConcertByIdAndUser :one
SELECT * FROM concert WHERE id = ? AND user_id_fk = ?;

-- name: FindConcertsOfUserSortedByDate :many
SELECT * FROM concert WHERE user_id_fk = ? ORDER BY due_date DESC;


-- name: FindAllNotesInConcertByPlace :many
SELECT * FROM note_in_concert WHERE concert_id_fk = ? ORDER BY place_in_concert;

-- name: DeleteNoteInConcert :exec
DELETE FROM note_in_concert WHERE concert_id_fk = ? AND note_id_fk = ?;

-- name: DeleteNotesInConcert :exec
DELETE FROM note_in_concert WHERE concert_id_fk = ?;

-- name: DeleteNotesInConcertByNoteId :exec
DELETE FROM note_in_concert WHERE note_id_fk = ?;

-- name: DeleteConcert :exec
DELETE FROM concert WHERE id = ?;

-- name: CreateConcert :execlastid
INSERT INTO concert (id, title, description, location, due_date, hints, user_id_fk) VALUES (?, ?, ?, ?, ?, ?, ?);

-- name: HealthCheck :one
SELECT 1;

-- name: FindAllParentFolders :many
SELECT * FROM elements WHERE parent IS NULL AND type = 'folder' AND user_id_fk = ? ORDER BY name;


-- name: CreateFolder :execlastid
INSERT INTO elements (id, type, name, description, user_id_fk, parent) VALUES (?,'folder', ?, ?, ?, ?);

-- name: CreateNote :execlastid
INSERT INTO elements (id, type, name, description, user_id_fk, parent, author_id_fk, number_of_pages) VALUES (?,'note', ?, ?, ?, ?, ?, ?);

-- name: FindFolderById :one
SELECT * FROM elements WHERE id = ? and user_id_fk = ?;

-- name: SearchByFolderName :many
SELECT * FROM elements WHERE name LIKE CONCAT('%', ?, '%') and type = 'folder' AND user_id_fk = ? ORDER BY name LIMIT ? OFFSET ?;

-- name: CountSearchByFolderName :one
SELECT COUNT(*) FROM elements WHERE name LIKE CONCAT('%', ?, '%') and type = 'folder' AND user_id_fk = ?;


-- name: DeleteNote :exec
DELETE FROM elements WHERE id = ? AND user_id_fk = ?;

-- name: UpdateNote :exec
UPDATE elements SET name = ?, description = ?, author_id_fk = ?, number_of_pages = ?, pdf_content = ? WHERE id = ?;

-- name: UpdateFolder :exec
UPDATE elements SET name=?, description = ?, parent = ? WHERE id = ? and user_id_fk = ?;


-- name: MoveToFolder :exec
UPDATE elements SET parent = ? WHERE id = ? and user_id_fk = ?;


-- name: DeleteAllAuthors :exec
DELETE FROM authors;

-- name: DeleteAllNotes :exec
DELETE FROM elements;

-- name: DeleteAllUser :exec
DELETE FROM user;

-- name: DeleteAllData :exec
START TRANSACTION;
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE elements;
TRUNCATE authors;
TRUNCATE concert;
TRUNCATE user;
SET FOREIGN_KEY_CHECKS = 1;
COMMIT;

-- name: FindAllIcalSyncsByUser :many
SELECT * FROM ical_sync WHERE user_id_fk = ? ORDER BY ical_url;

-- name: FindIcalSyncById :one
SELECT * FROM ical_sync WHERE id = ? AND user_id_fk = ?;

-- name: CreateIcalSync :execlastid
INSERT INTO ical_sync (id, user_id_fk, ical_url, type, last_synced) VALUES (?, ?, ?, ?, ?);

-- name: UpdateIcalSync :exec
UPDATE ical_sync SET ical_url = ?, last_synced = ? WHERE id = ? AND user_id_fk = ?;

-- name: UpdateIcalSyncByTypeAndUser :exec
UPDATE ical_sync SET ical_url = ?, last_synced = ? WHERE type = ? AND user_id_fk = ?;

-- name: FindIcalSyncByTypeAndUser :one
SELECT * FROM ical_sync WHERE type = ? AND user_id_fk = ?;

-- name: FindIcalSyncWithUserSinceDate :many
SELECT sqlc.embed(ical_sync), sqlc.embed(user) FROM ical_sync JOIN user ON ical_sync.user_id_fk = user.id WHERE ical_sync.last_synced > ? or ical_sync.last_synced IS NULL;


-- name: CreateEvent :exec
REPLACE INTO events (
    uid,
    user_id_fk,
    summary,
    url,
    geo_date_x,
    geo_date_y,
    location,
    tz_id,
    description,
    start_date,
    end_date
) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
);

-- name: UpdateLastSyncOfIcal :exec
UPDATE ical_sync SET last_synced = ? WHERE id = ?;

-- name: GetEventsOfUser :many
SELECT * FROM events WHERE user_id_fk = ? AND start_date > ?  ORDER BY start_date;

-- name: GetClubs :many
SELECT sqlc.embed(clubs), sqlc.embed(address) from clubs join address ON clubs.address_id = address.id WHERE clubs.id = ?;

-- name: SaveClub :exec
REPLACE INTO clubs(
        id,
        name,
        address_id
) VALUES(
        ?,
        ?,
        ?
);

-- name: SaveAddress :exec
REPLACE INTO address(
        id,
        street,
        house_number,
        location,
        postal_code,
        country
) VALUES (
        ?, ?, ?, ?, ?, ?
)

-- name: FindClubByName :exec
SELECT sqlc.embed(clubs), sqlc.embed(address) from clubs join address ON clubs.address_id = address.id WHERE ;
