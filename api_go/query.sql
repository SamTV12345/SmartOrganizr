-- name: FindAllByCreator :many
SELECT * FROM authors
WHERE user_id_fk = ? ORDER BY name LIMIT ? OFFSET ?;

-- name: FindAllAuthorsByCreatorUnpaged :many
SELECT * FROM authors WHERE user_id_fk = ? ORDER BY name;


-- name: FindAllAuthorsByCreatorAndSearchText :many
SELECT a.*
FROM authors a
         JOIN user c ON a.user_id_fk = c.user_id
WHERE c.user_id = ?
  AND (a.name LIKE CONCAT('%', ?, '%')
    OR a.extra_information LIKE CONCAT('%', ?, '%'));

-- name: GetIndexAuthorsOnPage :many
SELECT COUNT(*) FROM authors a WHERE a.name<? ORDER BY a.name,a.id;

-- name: FindAuthorById :one
SELECT * FROM authors WHERE id = ? and user_id_fk = ?;

-- name: UpdateAuthor :exec
UPDATE authors SET name = ?, extra_information = ? WHERE id = ?;

-- name: DeleteAuthor :exec
DELETE FROM authors WHERE id = ? AND user_id_fk = ?;

-- name: CreateAuthor :execlastid
INSERT INTO authors (name, extra_information, user_id_fk) VALUES (?, ?, ?);


-- name: FindUserById :one
SELECT * FROM user WHERE user_id = ?;

-- name: FindConcertById :one
SELECT * FROM concert WHERE id = ?;


-- name: FindAllNotesByAuthor :many
SELECT * FROM elements WHERE type ='note' AND author_id_fk = ? AND user_id_fk = ? ORDER BY title;
