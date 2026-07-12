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

-- name: FindAuthorsByUserAndIds :many
SELECT * FROM authors WHERE user_id_fk = ? AND id IN (sqlc.slice('ids'));

-- name: UpdateAuthor :exec
UPDATE authors
SET name = ?, extra_information = ?, wikidata_id = ?, birth_year = ?, death_year = ?
WHERE id = ? AND user_id_fk = ?;

-- name: DeleteAuthor :exec
DELETE FROM authors WHERE id = ? AND user_id_fk = ?;

-- name: CreateAuthor :execlastid
INSERT INTO authors (id, name, extra_information, user_id_fk, wikidata_id, birth_year, death_year)
VALUES (?, ?, ?, ?, ?, ?, ?);


-- name: FindUserById :one
SELECT * FROM user WHERE id = ?;

-- name: FindUserByEmail :one
SELECT * FROM user WHERE email = ?;

-- name: SetIcalFeedToken :exec
UPDATE user SET ical_feed_token = ? WHERE id = ?;

-- name: GetIcalFeedToken :one
SELECT ical_feed_token FROM user WHERE id = ?;

-- name: FindUserByIcalFeedToken :one
SELECT * FROM user WHERE ical_feed_token = ?;

-- name: ListClubEventsForUserFeed :many
SELECT e.*, c.name AS club_name
FROM club_events e
JOIN clubs c ON c.id = e.club_id
JOIN club_participant p ON p.club_id = e.club_id AND p.user_id = sqlc.arg(user_id)
WHERE e.start_date > sqlc.arg(since)
  AND (e.section_fk IS NULL OR e.section_fk = p.section_fk OR p.role IN ('LEITER', 'CO_LEITER'))
ORDER BY e.start_date;




-- name: FindAllNotesByAuthor :many
SELECT * FROM elements
WHERE type ='note' AND user_id_fk = ?
  AND (composer_id_fk = ? OR arranger_id_fk = ?)
ORDER BY name;


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
SELECT sqlc.embed(elements)
FROM elements
WHERE parent = ? AND elements.user_id_fk = ?
ORDER BY elements.name;

-- name: FindAllNotesByCreatorPaged :many
SELECT
  sqlc.embed(note),
  sqlc.embed(p)
FROM elements as note
JOIN elements p ON p.id = note.parent
WHERE note.type ='note' AND note.user_id_fk = ?
ORDER BY note.name LIMIT ? OFFSET ?;

-- name: FindAllNotesByCreator :many
SELECT
  sqlc.embed(note),
  sqlc.embed(p)
FROM elements as note
JOIN elements p ON p.id = note.parent
WHERE note.type ='note' AND note.user_id_fk = ?
ORDER BY note.name;

-- name: CountFindAllNotesByCreator :one
SELECT COUNT(*) FROM elements as note WHERE note.type ='note' AND note.user_id_fk = ?;

-- name: FindAllNotesByCreatorPagedWithSearch :many
SELECT
  sqlc.embed(note),
  sqlc.embed(p)
FROM elements as note
JOIN elements p ON p.id = note.parent
WHERE note.type ='note'
  AND note.name LIKE CONCAT('%',?,'%')
  AND note.user_id_fk = ?
ORDER BY note.name LIMIT ? OFFSET ?;

-- name: FindAllNotesByCreatorWithSearch :many
SELECT
  sqlc.embed(note),
  sqlc.embed(p)
FROM elements as note
JOIN elements p ON p.id = note.parent
WHERE note.type ='note'
  AND note.name LIKE CONCAT('%',?,'%')
  AND note.user_id_fk = ?
ORDER BY note.name;

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

-- name: CreateNoteInConcert :exec
INSERT INTO note_in_concert (concert_id_fk, note_id_fk, place_in_concert) VALUES (?, ?, ?);

-- name: UpdateConcert :exec
UPDATE concert SET title = ?, description = ?, location = ?, due_date = ?, hints = ? WHERE id = ? AND user_id_fk = ?;

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
INSERT INTO elements (id, type, name, description, user_id_fk, parent, composer_id_fk, arranger_id_fk, number_of_pages, pdf_content) VALUES (?,'note', ?, ?, ?, ?, ?, ?, ?, ?);

-- name: FindFolderById :one
SELECT * FROM elements WHERE id = ? and user_id_fk = ?;

-- name: FindFolderByIdWithoutUserId :one
SELECT * FROM elements WHERE id = ?;

-- name: SearchByFolderName :many
SELECT * FROM elements WHERE name LIKE CONCAT('%', ?, '%') and type = 'folder' AND user_id_fk = ? ORDER BY name LIMIT ? OFFSET ?;

-- name: CountSearchByFolderName :one
SELECT COUNT(*) FROM elements WHERE name LIKE CONCAT('%', ?, '%') and type = 'folder' AND user_id_fk = ?;


-- name: DeleteNote :exec
DELETE FROM elements WHERE id = ? AND user_id_fk = ?;

-- name: UpdateNote :exec
UPDATE elements SET name = ?, description = ?, composer_id_fk = ?, arranger_id_fk = ?, number_of_pages = ?, pdf_content = ? WHERE id = ?;

-- name: UpdateFolder :exec
UPDATE elements SET name=?, description = ?, parent = ? WHERE id = ? and user_id_fk = ?;


-- name: MoveToFolder :exec
UPDATE elements SET parent = ? WHERE id = ? and user_id_fk = ?;

-- name: DeleteAllUser :exec
DELETE FROM user;




-- name: DeleteAllElements :exec
TRUNCATE elements ;
-- name: DeleteAllAuthors :exec
TRUNCATE authors;
-- name: DeleteAllConcerts :exec
TRUNCATE concert;
-- name: DeleteAllUsers :exec
TRUNCATE user;

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
SELECT sqlc.embed(clubs), sqlc.embed(address)
from clubs
         join address ON clubs.address_id = address.id
         join club_participant cp ON cp.club_id = clubs.id
WHERE cp.user_id = ?;

-- name: SaveClub :exec
REPLACE INTO clubs(
        id,
        name,
        address_id,
        club_type,
        dates_visible_for_all_members,
        members_can_send_messages,
        feedback_visibility,
        reason_visibility,
        confirmed_representative
) VALUES(
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
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
);

-- name: FindClubByName :many
SELECT sqlc.embed(clubs), sqlc.embed(address) from clubs join address ON clubs.address_id = address.id WHERE clubs.name = ?;

-- name: FindClubByID :one
SELECT sqlc.embed(clubs), sqlc.embed(address) from clubs join address ON clubs.address_id = address.id WHERE clubs.id = ?;


-- name: CreateMemberInClub :exec
INSERT IGNORE INTO club_participant(
        user_id,
        club_id,
        role
) VALUES (
        ?,
        ?,
        ?
);

-- name: FindAllMembersOfClub :many
SELECT sqlc.embed(club_participant), sqlc.embed(user), club_section.name AS section_name
from club_participant
         join user on user.id = club_participant.user_id
         left join club_section on club_section.id = club_participant.section_fk
where club_participant.club_id = ?;

-- name: FindClubMemberByClubAndUser :one
SELECT sqlc.embed(club_participant), sqlc.embed(user)
from club_participant
         join user on user.id = club_participant.user_id
where club_participant.club_id = ? and club_participant.user_id = ?;

-- name: UpdateClubMemberRole :exec
UPDATE club_participant
SET role = ?
WHERE club_id = ? and user_id = ?;

-- name: UpdateClubMemberAuthorized :exec
UPDATE club_participant
SET authorized = ?
WHERE club_id = ? and user_id = ?;

-- name: CountClubMembersByRole :one
SELECT COUNT(*)
from club_participant
where club_id = ? and role = ?;

-- name: CreateClubInvitation :exec
INSERT INTO club_invitation(
        token,
        club_id,
        invited_email,
        invited_by_user_id,
        expires_at
) VALUES (
        ?, ?, ?, ?, ?
);

-- name: FindClubInvitationByToken :one
SELECT token, club_id, invited_email, invited_by_user_id, created_at, expires_at, accepted_at
from club_invitation
where token = ?;

-- name: MarkClubInvitationAccepted :exec
UPDATE club_invitation
SET accepted_at = ?
WHERE token = ?;

-- name: FindPendingClubInvitations :many
SELECT token, club_id, invited_email, invited_by_user_id, created_at, expires_at
from club_invitation
where club_id = ? and accepted_at IS NULL and expires_at > sqlc.arg(now)
ORDER BY created_at DESC;

-- name: DeleteClubInvitation :execrows
DELETE FROM club_invitation WHERE token = ? AND club_id = ?;

-- name: DeleteClubInvitationsByClub :exec
DELETE FROM club_invitation WHERE club_id = ?;

-- name: DeleteClubMember :exec
DELETE FROM club_participant WHERE club_id = ? AND user_id = ?;

-- name: DeleteClubMembersByClub :exec
DELETE FROM club_participant WHERE club_id = ?;

-- name: DeleteClub :exec
DELETE FROM clubs WHERE id = ?;

-- name: DeleteAddress :exec
DELETE FROM address WHERE id = ?;


-- name: DeleteFolderCasCade :exec
DELETE FROM elements WHERE id = ? AND user_id_fk = ? and type = 'folder';

-- name: FindAuthorByUserAndWikidataId :one
SELECT * FROM authors WHERE user_id_fk = ? AND wikidata_id = ?;

-- name: FindAuthorsByUserAndExactName :many
SELECT * FROM authors WHERE user_id_fk = ? AND name = ?;

-- name: FindAuthorsByUserAndNameLike :many
SELECT * FROM authors
WHERE user_id_fk = sqlc.arg(user_id_fk) AND name LIKE CONCAT('%', sqlc.arg(term), '%')
ORDER BY name LIMIT 10;

-- name: FindElementsByUserAndNameLike :many
SELECT * FROM elements
WHERE user_id_fk = sqlc.arg(user_id_fk) AND type = 'note' AND name LIKE CONCAT('%', sqlc.arg(term), '%')
ORDER BY name LIMIT 10;

-- name: CreateNoteWithWikidata :execlastid
INSERT INTO elements (
  type, id, creation_date, description, name, number_of_pages,
  user_id_fk, parent, composer_id_fk, arranger_id_fk,
  wikidata_id, composition_year, genre
) VALUES (
  'note', ?, NOW(), ?, ?, ?,
  ?, ?, ?, ?,
  ?, ?, ?
);

-- name: CreateClubChat :exec
INSERT INTO club_chat (id, club_id, user_a_id, user_b_id)
VALUES (?, ?, ?, ?);

-- name: FindClubChatByUsers :one
SELECT id, club_id, user_a_id, user_b_id, created_at
FROM club_chat
WHERE club_id = ? AND user_a_id = ? AND user_b_id = ?;

-- name: FindClubChatByID :one
SELECT id, club_id, user_a_id, user_b_id, created_at
FROM club_chat
WHERE id = ?;

-- name: ListClubChatsForUser :many
SELECT
    cc.id AS chat_id,
    cc.club_id AS club_id,
    CASE WHEN cc.user_a_id = sqlc.arg(requester_id) THEN cc.user_b_id ELSE cc.user_a_id END AS other_user_id,
    u.username AS other_username,
    u.firstname AS other_firstname,
    u.lastname AS other_lastname,
    u.email AS other_email,
    cm.content AS last_message,
    cm.sender_user_id AS last_sender_user_id,
    cm.created_at AS last_message_at
FROM club_chat cc
JOIN user u ON u.id = CASE WHEN cc.user_a_id = sqlc.arg(requester_id) THEN cc.user_b_id ELSE cc.user_a_id END
LEFT JOIN club_chat_message cm ON cm.id = (
    SELECT m.id
    FROM club_chat_message m
    WHERE m.chat_id = cc.id
    ORDER BY m.created_at DESC
    LIMIT 1
)
WHERE cc.club_id = sqlc.arg(club_id) AND (cc.user_a_id = sqlc.arg(requester_id) OR cc.user_b_id = sqlc.arg(requester_id))
ORDER BY COALESCE(cm.created_at, cc.created_at) DESC;

-- name: CreateClubChatMessage :exec
INSERT INTO club_chat_message (id, chat_id, sender_user_id, content)
VALUES (?, ?, ?, ?);

-- name: ListClubChatMessages :many
SELECT
    cm.id,
    cm.chat_id,
    cm.sender_user_id,
    u.username AS sender_username,
    u.firstname AS sender_firstname,
    u.lastname AS sender_lastname,
    u.email AS sender_email,
    cm.content,
    cm.created_at
FROM club_chat_message cm
JOIN user u ON u.id = cm.sender_user_id
WHERE cm.chat_id = ?
ORDER BY cm.created_at ASC
LIMIT 500;

-- name: ListClubChatCandidates :many
SELECT u.id AS user_id, u.username, u.firstname, u.lastname, u.email
FROM club_participant cp
JOIN user u ON u.id = cp.user_id
WHERE cp.club_id = sqlc.arg(club_id) AND cp.user_id <> sqlc.arg(requester_id)
ORDER BY u.firstname, u.lastname, u.username, u.id;

-- name: CreatePinboardPost :exec
INSERT INTO club_pinboard_post (id, club_id, author_user_id, title, body, pinned)
VALUES (?, ?, ?, ?, ?, ?);

-- name: UpdatePinboardPost :exec
UPDATE club_pinboard_post
SET title = ?, body = ?, pinned = ?, updated_at = CURRENT_TIMESTAMP
WHERE id = sqlc.arg(id) AND club_id = sqlc.arg(club_id);

-- name: DeletePinboardPost :exec
DELETE FROM club_pinboard_post
WHERE id = sqlc.arg(id) AND club_id = sqlc.arg(club_id);

-- name: GetPinboardPost :one
SELECT
    p.id,
    p.club_id,
    p.author_user_id,
    u.username AS author_username,
    u.firstname AS author_firstname,
    u.lastname AS author_lastname,
    p.title,
    p.body,
    p.pinned,
    p.created_at,
    p.updated_at
FROM club_pinboard_post p
JOIN user u ON u.id = p.author_user_id
WHERE p.id = sqlc.arg(id) AND p.club_id = sqlc.arg(club_id);

-- name: ListPinboardPostsForClub :many
SELECT
    p.id,
    p.club_id,
    p.author_user_id,
    u.username AS author_username,
    u.firstname AS author_firstname,
    u.lastname AS author_lastname,
    p.title,
    p.body,
    p.pinned,
    p.created_at,
    p.updated_at
FROM club_pinboard_post p
JOIN user u ON u.id = p.author_user_id
WHERE p.club_id = ?
ORDER BY p.pinned DESC, p.created_at DESC;

-- name: ListRecentPinboardPostsForUser :many
SELECT
    p.id,
    p.club_id,
    c.name AS club_name,
    p.author_user_id,
    u.username AS author_username,
    u.firstname AS author_firstname,
    u.lastname AS author_lastname,
    p.title,
    p.body,
    p.pinned,
    p.created_at,
    p.updated_at
FROM club_pinboard_post p
JOIN club_participant cp ON cp.club_id = p.club_id AND cp.user_id = sqlc.arg(user_id)
JOIN clubs c ON c.id = p.club_id
JOIN user u ON u.id = p.author_user_id
ORDER BY p.created_at DESC
LIMIT ?;

-- name: CreateClubFile :exec
INSERT INTO club_file (id, club_id, name, mime_type, size_bytes, content, uploaded_by_user_id)
VALUES (?, ?, ?, ?, ?, ?, ?);

-- name: GetClubFileContent :one
SELECT id, name, mime_type, size_bytes, content
FROM club_file
WHERE id = sqlc.arg(id) AND club_id = sqlc.arg(club_id);

-- name: CreateAiChatSession :exec
INSERT INTO ai_chat_session (id, user_fk, title)
VALUES (?, ?, ?);

-- name: FindAiChatSessionsByUser :many
SELECT * FROM ai_chat_session
WHERE user_fk = ?
ORDER BY updated_at DESC;

-- name: FindAiChatSessionById :one
SELECT * FROM ai_chat_session
WHERE id = ?;

-- name: UpdateAiChatSessionTitle :exec
UPDATE ai_chat_session SET title = ? WHERE id = ?;

-- name: TouchAiChatSession :exec
UPDATE ai_chat_session SET updated_at = CURRENT_TIMESTAMP WHERE id = ?;

-- name: DeleteAiChatSession :exec
DELETE FROM ai_chat_session WHERE id = ?;

-- name: CreateAiChatMessage :exec
INSERT INTO ai_chat_message (session_fk, role, content)
VALUES (?, ?, ?);

-- name: FindAiChatMessagesBySession :many
SELECT * FROM ai_chat_message
WHERE session_fk = ?
ORDER BY created_at ASC, id ASC;

-- name: ListClubFilesForClub :many
SELECT
    f.id,
    f.club_id,
    f.name,
    f.mime_type,
    f.size_bytes,
    f.uploaded_by_user_id,
    u.username AS uploader_username,
    u.firstname AS uploader_firstname,
    u.lastname AS uploader_lastname,
    f.created_at
FROM club_file f
JOIN user u ON u.id = f.uploaded_by_user_id
WHERE f.club_id = ?
ORDER BY f.created_at DESC;

-- name: DeleteClubFile :exec
DELETE FROM club_file
WHERE id = sqlc.arg(id) AND club_id = sqlc.arg(club_id);

-- name: UpsertChatRead :exec
INSERT INTO club_chat_read (chat_id, user_id, last_read_at)
VALUES (sqlc.arg(chat_id), sqlc.arg(user_id), NOW())
ON DUPLICATE KEY UPDATE last_read_at = NOW();

-- name: CountUnreadForChat :one
SELECT COUNT(*)
FROM club_chat_message m
LEFT JOIN club_chat_read r ON r.chat_id = m.chat_id AND r.user_id = sqlc.arg(user_id)
WHERE m.chat_id = sqlc.arg(chat_id)
  AND m.sender_user_id <> sqlc.arg(user_id)
  AND (r.last_read_at IS NULL OR m.created_at > r.last_read_at);

-- name: CountUnreadForUserByClub :many
SELECT cc.club_id, c.name AS club_name, COUNT(*) AS unread
FROM club_chat cc
JOIN clubs c ON c.id = cc.club_id
JOIN club_chat_message m ON m.chat_id = cc.id
LEFT JOIN club_chat_read r ON r.chat_id = cc.id AND r.user_id = sqlc.arg(user_id)
WHERE (cc.user_a_id = sqlc.arg(user_id) OR cc.user_b_id = sqlc.arg(user_id))
  AND m.sender_user_id <> sqlc.arg(user_id)
  AND (r.last_read_at IS NULL OR m.created_at > r.last_read_at)
GROUP BY cc.club_id, c.name;

-- name: CreateClubEvent :exec
INSERT INTO club_events (
    id, club_id, summary, description, location, geo_date_x, geo_date_y,
    event_type, start_date, end_date, created_by_user_id, section_fk, series_id
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

-- name: UpdateClubEvent :exec
UPDATE club_events
SET summary = ?, description = ?, location = ?, geo_date_x = ?, geo_date_y = ?,
    event_type = ?, start_date = ?, end_date = ?, section_fk = ?, updated_at = CURRENT_TIMESTAMP
WHERE id = ? AND club_id = ?;

-- name: SoftCancelClubEvent :exec
UPDATE club_events SET cancelled = 1, updated_at = CURRENT_TIMESTAMP
WHERE id = ? AND club_id = ?;

-- name: DeleteClubEvent :exec
DELETE FROM club_events WHERE id = ? AND club_id = ?;

-- name: DeleteClubEventSeries :execrows
DELETE FROM club_events WHERE series_id = ? AND club_id = ?;

-- name: GetClubEventByID :one
SELECT * FROM club_events WHERE id = ? AND club_id = ?;

-- name: ListClubEventsForClub :many
SELECT
    e.*,
    sec.name AS section_name,
    (SELECT COUNT(*) FROM club_event_response r WHERE r.event_id = e.id AND r.status = 'YES')   AS yes_count,
    (SELECT COUNT(*) FROM club_event_response r WHERE r.event_id = e.id AND r.status = 'NO')    AS no_count,
    (SELECT COUNT(*) FROM club_event_response r WHERE r.event_id = e.id AND r.status = 'MAYBE') AS maybe_count,
    (SELECT COUNT(*) FROM club_participant p WHERE p.club_id = e.club_id
        AND (e.section_fk IS NULL OR p.section_fk = e.section_fk))                              AS member_count,
    mine.status AS my_status,
    mine.reason AS my_reason
FROM club_events e
JOIN club_participant me ON me.club_id = e.club_id AND me.user_id = sqlc.arg(user_id)
LEFT JOIN club_section sec ON sec.id = e.section_fk
LEFT JOIN club_event_response mine ON mine.event_id = e.id AND mine.user_id = sqlc.arg(user_id)
WHERE e.club_id = sqlc.arg(club_id) AND e.start_date > sqlc.arg(since)
  AND (e.section_fk IS NULL OR e.section_fk = me.section_fk OR me.role IN ('LEITER', 'CO_LEITER'))
ORDER BY e.start_date;

-- name: ListClubEventsForUser :many
SELECT
    e.*,
    c.name AS club_name,
    sec.name AS section_name,
    (SELECT COUNT(*) FROM club_event_response r WHERE r.event_id = e.id AND r.status = 'YES')   AS yes_count,
    (SELECT COUNT(*) FROM club_event_response r WHERE r.event_id = e.id AND r.status = 'NO')    AS no_count,
    (SELECT COUNT(*) FROM club_event_response r WHERE r.event_id = e.id AND r.status = 'MAYBE') AS maybe_count,
    (SELECT COUNT(*) FROM club_participant p2 WHERE p2.club_id = e.club_id
        AND (e.section_fk IS NULL OR p2.section_fk = e.section_fk))                             AS member_count,
    mine.status AS my_status,
    mine.reason AS my_reason
FROM club_events e
JOIN clubs c ON c.id = e.club_id
JOIN club_participant p ON p.club_id = e.club_id AND p.user_id = sqlc.arg(user_id)
LEFT JOIN club_section sec ON sec.id = e.section_fk
LEFT JOIN club_event_response mine ON mine.event_id = e.id AND mine.user_id = sqlc.arg(user_id)
WHERE e.start_date > sqlc.arg(since) AND e.cancelled = 0
  AND (e.section_fk IS NULL OR e.section_fk = p.section_fk OR p.role IN ('LEITER', 'CO_LEITER'))
ORDER BY e.start_date;

-- name: UpsertClubEventResponse :exec
INSERT INTO club_event_response (event_id, user_id, status, reason, responded_at)
VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE status = VALUES(status), reason = VALUES(reason), responded_at = CURRENT_TIMESTAMP;

-- name: GetClubEventResponse :one
SELECT * FROM club_event_response WHERE event_id = ? AND user_id = ?;

-- name: ListClubEventResponses :many
SELECT
    r.event_id, r.user_id, r.status, r.reason, r.responded_at,
    u.firstname, u.lastname, u.username
FROM club_event_response r
JOIN user u ON u.id = r.user_id
WHERE r.event_id = ?;

-- name: UpdateClub :exec
UPDATE clubs
SET name = ?, club_type = ?, dates_visible_for_all_members = ?,
    members_can_send_messages = ?, feedback_visibility = ?, reason_visibility = ?
WHERE id = ?;

-- name: UpdateAddress :exec
UPDATE address
SET street = ?, house_number = ?, location = ?, postal_code = ?, country = ?
WHERE id = ?;

-- Inventory sweep (docs/superpowers/specs/2026-07-12-inventory-sweep-design.md)

-- name: MaxInventoryNoForUser :one
SELECT COALESCE(MAX(inventory_no), 0) FROM elements WHERE user_id_fk = ?;

-- name: SetNoteInventoryNo :execrows
UPDATE elements SET inventory_no = ? WHERE id = ? AND user_id_fk = ? AND inventory_no IS NULL;

-- name: FindNoteByUserAndInventoryNo :one
SELECT note.id, note.name, note.parent, p.name AS parent_name
FROM elements note
         LEFT JOIN elements p ON p.id = note.parent
WHERE note.user_id_fk = ? AND note.inventory_no = ? AND note.type = 'note';

-- name: ListNoteNamesForUser :many
SELECT id, name, inventory_no, number_of_pages, parent FROM elements WHERE user_id_fk = ? AND type = 'note';

-- name: DeleteMappeTagForFolder :exec
DELETE FROM mappe_tag WHERE folder_fk = ?;

-- name: CreateMappeTag :exec
INSERT INTO mappe_tag (tag_id, folder_fk, user_fk) VALUES (?, ?, ?);

-- name: FindMappeTag :one
SELECT mappe_tag.tag_id, mappe_tag.folder_fk, mappe_tag.user_fk, elements.name AS folder_name
FROM mappe_tag
         JOIN elements ON elements.id = mappe_tag.folder_fk
WHERE mappe_tag.tag_id = ?;

-- name: FindMappeTagForFolder :one
SELECT tag_id FROM mappe_tag WHERE folder_fk = ?;

-- name: CreateInventorySweep :exec
INSERT INTO inventory_sweep (id, folder_fk, user_fk) VALUES (?, ?, ?);

-- name: FindInventorySweep :one
SELECT * FROM inventory_sweep WHERE id = ?;

-- name: CompleteInventorySweep :exec
UPDATE inventory_sweep SET completed_at = CURRENT_TIMESTAMP WHERE id = ?;

-- name: CreateInventorySighting :execrows
INSERT IGNORE INTO inventory_sighting (sweep_fk, note_fk, matched_via, confidence, incomplete)
VALUES (?, ?, ?, ?, ?);

-- name: ListSightingsForSweep :many
SELECT s.note_fk,
       s.matched_via,
       s.confidence,
       s.incomplete,
       e.name         AS note_name,
       e.inventory_no,
       e.parent       AS parent_id,
       p.name         AS parent_name
FROM inventory_sighting s
         JOIN elements e ON e.id = s.note_fk
         LEFT JOIN elements p ON p.id = e.parent
WHERE s.sweep_fk = ?;

-- name: FindNotesInFolderForInventory :many
SELECT id, name, number_of_pages, inventory_no FROM elements WHERE parent = ? AND type = 'note' AND user_id_fk = ?;

-- name: FindLastSightingsForNotes :many
SELECT s.note_fk, sw.folder_fk, sw.completed_at, e.name AS folder_name
FROM inventory_sighting s
         JOIN inventory_sweep sw ON sw.id = s.sweep_fk AND sw.completed_at IS NOT NULL
         JOIN elements e ON e.id = sw.folder_fk
WHERE s.note_fk IN (sqlc.slice('ids'))
ORDER BY sw.completed_at DESC;

-- Club sections (docs/superpowers/specs/2026-07-12-club-sections-design.md)

-- name: CreateClubSection :exec
INSERT INTO club_section (id, club_id, name) VALUES (?, ?, ?);

-- name: RenameClubSection :execrows
UPDATE club_section SET name = ? WHERE id = ? AND club_id = ?;

-- name: DeleteClubSection :execrows
DELETE FROM club_section WHERE id = ? AND club_id = ?;

-- name: FindClubSection :one
SELECT * FROM club_section WHERE id = ? AND club_id = ?;

-- name: ListClubSections :many
SELECT s.id, s.name, COUNT(p.user_id) AS member_count
FROM club_section s
         LEFT JOIN club_participant p ON p.section_fk = s.id
WHERE s.club_id = ?
GROUP BY s.id, s.name
ORDER BY s.name;

-- name: UpdateClubMemberSection :exec
UPDATE club_participant SET section_fk = ?, section_leader = ? WHERE club_id = ? AND user_id = ?;
