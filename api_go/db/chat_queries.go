package db

import (
	"context"
	"database/sql"
)

type ClubChatEntity struct {
	ID        string
	ClubID    string
	UserAID   string
	UserBID   string
	CreatedAt sql.NullTime
}

type ClubChatListRow struct {
	ChatID           string
	ClubID           string
	OtherUserID      string
	OtherUsername    sql.NullString
	OtherFirstname   sql.NullString
	OtherLastname    sql.NullString
	OtherEmail       sql.NullString
	LastMessageID    sql.NullString
	LastMessage      sql.NullString
	LastSenderUserID sql.NullString
	LastMessageAt    sql.NullTime
}

type ClubChatMessageRow struct {
	ID              string
	ChatID          string
	SenderUserID    string
	SenderUsername  sql.NullString
	SenderFirstname sql.NullString
	SenderLastname  sql.NullString
	SenderEmail     sql.NullString
	Content         string
	CreatedAt       sql.NullTime
}

type ClubChatCandidateRow struct {
	UserID    string
	Username  sql.NullString
	Firstname sql.NullString
	Lastname  sql.NullString
	Email     sql.NullString
}

const createClubChat = `
INSERT INTO club_chat (id, club_id, user_a_id, user_b_id)
VALUES (?, ?, ?, ?)
`

type CreateClubChatParams struct {
	ID      string
	ClubID  string
	UserAID string
	UserBID string
}

func (q *Queries) CreateClubChat(ctx context.Context, arg CreateClubChatParams) error {
	_, err := q.db.ExecContext(ctx, createClubChat, arg.ID, arg.ClubID, arg.UserAID, arg.UserBID)
	return err
}

const findClubChatByUsers = `
SELECT id, club_id, user_a_id, user_b_id, created_at
FROM club_chat
WHERE club_id = ? AND user_a_id = ? AND user_b_id = ?
`

type FindClubChatByUsersParams struct {
	ClubID  string
	UserAID string
	UserBID string
}

func (q *Queries) FindClubChatByUsers(ctx context.Context, arg FindClubChatByUsersParams) (ClubChatEntity, error) {
	row := q.db.QueryRowContext(ctx, findClubChatByUsers, arg.ClubID, arg.UserAID, arg.UserBID)
	var i ClubChatEntity
	err := row.Scan(&i.ID, &i.ClubID, &i.UserAID, &i.UserBID, &i.CreatedAt)
	return i, err
}

const findClubChatByID = `
SELECT id, club_id, user_a_id, user_b_id, created_at
FROM club_chat
WHERE id = ?
`

func (q *Queries) FindClubChatByID(ctx context.Context, chatID string) (ClubChatEntity, error) {
	row := q.db.QueryRowContext(ctx, findClubChatByID, chatID)
	var i ClubChatEntity
	err := row.Scan(&i.ID, &i.ClubID, &i.UserAID, &i.UserBID, &i.CreatedAt)
	return i, err
}

const listClubChatsForUser = `
SELECT
    cc.id,
    cc.club_id,
    CASE WHEN cc.user_a_id = ? THEN cc.user_b_id ELSE cc.user_a_id END AS other_user_id,
    u.username,
    u.firstname,
    u.lastname,
    u.email,
    cm.id AS last_message_id,
    cm.content AS last_message,
    cm.sender_user_id AS last_sender_user_id,
    cm.created_at AS last_message_at
FROM club_chat cc
JOIN user u ON u.id = CASE WHEN cc.user_a_id = ? THEN cc.user_b_id ELSE cc.user_a_id END
LEFT JOIN club_chat_message cm ON cm.id = (
    SELECT m.id
    FROM club_chat_message m
    WHERE m.chat_id = cc.id
    ORDER BY m.created_at DESC
    LIMIT 1
)
WHERE cc.club_id = ? AND (cc.user_a_id = ? OR cc.user_b_id = ?)
ORDER BY COALESCE(cm.created_at, cc.created_at) DESC
`

type ListClubChatsForUserParams struct {
	RequesterID string
	ClubID      string
}

func (q *Queries) ListClubChatsForUser(ctx context.Context, arg ListClubChatsForUserParams) ([]ClubChatListRow, error) {
	rows, err := q.db.QueryContext(ctx, listClubChatsForUser, arg.RequesterID, arg.RequesterID, arg.ClubID, arg.RequesterID, arg.RequesterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]ClubChatListRow, 0)
	for rows.Next() {
		var i ClubChatListRow
		if err := rows.Scan(
			&i.ChatID,
			&i.ClubID,
			&i.OtherUserID,
			&i.OtherUsername,
			&i.OtherFirstname,
			&i.OtherLastname,
			&i.OtherEmail,
			&i.LastMessageID,
			&i.LastMessage,
			&i.LastSenderUserID,
			&i.LastMessageAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const createClubChatMessage = `
INSERT INTO club_chat_message (id, chat_id, sender_user_id, content)
VALUES (?, ?, ?, ?)
`

type CreateClubChatMessageParams struct {
	ID           string
	ChatID       string
	SenderUserID string
	Content      string
}

func (q *Queries) CreateClubChatMessage(ctx context.Context, arg CreateClubChatMessageParams) error {
	_, err := q.db.ExecContext(ctx, createClubChatMessage, arg.ID, arg.ChatID, arg.SenderUserID, arg.Content)
	return err
}

const listClubChatMessages = `
SELECT
    cm.id,
    cm.chat_id,
    cm.sender_user_id,
    u.username,
    u.firstname,
    u.lastname,
    u.email,
    cm.content,
    cm.created_at
FROM club_chat_message cm
JOIN user u ON u.id = cm.sender_user_id
WHERE cm.chat_id = ?
ORDER BY cm.created_at ASC
LIMIT 500
`

func (q *Queries) ListClubChatMessages(ctx context.Context, chatID string) ([]ClubChatMessageRow, error) {
	rows, err := q.db.QueryContext(ctx, listClubChatMessages, chatID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]ClubChatMessageRow, 0)
	for rows.Next() {
		var i ClubChatMessageRow
		if err := rows.Scan(
			&i.ID,
			&i.ChatID,
			&i.SenderUserID,
			&i.SenderUsername,
			&i.SenderFirstname,
			&i.SenderLastname,
			&i.SenderEmail,
			&i.Content,
			&i.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listClubChatCandidates = `
SELECT u.id, u.username, u.firstname, u.lastname, u.email
FROM club_participant cp
JOIN user u ON u.id = cp.user_id
WHERE cp.club_id = ? AND cp.user_id <> ?
ORDER BY u.firstname, u.lastname, u.username, u.id
`

type ListClubChatCandidatesParams struct {
	ClubID      string
	RequesterID string
}

func (q *Queries) ListClubChatCandidates(ctx context.Context, arg ListClubChatCandidatesParams) ([]ClubChatCandidateRow, error) {
	rows, err := q.db.QueryContext(ctx, listClubChatCandidates, arg.ClubID, arg.RequesterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]ClubChatCandidateRow, 0)
	for rows.Next() {
		var i ClubChatCandidateRow
		if err := rows.Scan(
			&i.UserID,
			&i.Username,
			&i.Firstname,
			&i.Lastname,
			&i.Email,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
