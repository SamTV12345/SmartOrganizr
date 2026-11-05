package service

import (
	"api_go/controllers/dto"
	"api_go/db"
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"go.uber.org/zap"
)

var ErrReminderHours = errors.New("hoursBefore must be between 1 and 336")
var ErrEventCancelled = errors.New("event is cancelled")

// ReminderMailer is the part of MailService the reminders need (swappable in tests).
type ReminderMailer interface {
	SendEventReminderEmail(to, name, clubName, summary, location string, start time.Time, url string) error
}

// NotifEventReminder is pushed in-app together with the mail.
const NotifEventReminder = "club_event_reminder"

// ReminderService reminds members who have not answered an event yet:
// automatically (per-club setting, once per member and event) and on demand
// by a manager (with a cooldown).
type ReminderService struct {
	queries *db.Queries
	ctx     context.Context
	members ClubMemberService
	mailer  ReminderMailer
	hub     *NotificationHub
	appURL  string
	logger  *zap.SugaredLogger
}

func NewReminderService(queries *db.Queries, members ClubMemberService, mailer ReminderMailer, hub *NotificationHub, appURL string, logger *zap.SugaredLogger) ReminderService {
	return ReminderService{queries: queries, ctx: context.Background(), members: members, mailer: mailer, hub: hub, appURL: strings.TrimRight(appURL, "/"), logger: logger}
}

func (s *ReminderService) GetSettings(clubID, userID string) (dto.ClubReminderSettingsDto, error) {
	if _, err := s.members.GetRoleInClub(clubID, userID); err != nil {
		return dto.ClubReminderSettingsDto{}, ErrNoClubAccess
	}
	hours, err := s.queries.GetClubReminderSettings(s.ctx, clubID)
	if errors.Is(err, sql.ErrNoRows) {
		return dto.ClubReminderSettingsDto{}, nil
	}
	if err != nil {
		return dto.ClubReminderSettingsDto{}, err
	}
	h := int(hours)
	return dto.ClubReminderSettingsDto{HoursBefore: &h}, nil
}

func (s *ReminderService) requireManager(clubID, userID string) error {
	role, err := s.members.GetRoleInClub(clubID, userID)
	if err != nil {
		return ErrNoClubAccess
	}
	if !canManage(role) {
		return ErrManageForbidden
	}
	return nil
}

func (s *ReminderService) UpdateSettings(clubID, userID string, in dto.ClubReminderSettingsDto) (dto.ClubReminderSettingsDto, error) {
	if err := s.requireManager(clubID, userID); err != nil {
		return dto.ClubReminderSettingsDto{}, err
	}
	if in.HoursBefore == nil {
		if err := s.queries.DeleteClubReminderSettings(s.ctx, clubID); err != nil {
			return dto.ClubReminderSettingsDto{}, err
		}
		return dto.ClubReminderSettingsDto{}, nil
	}
	if !ValidReminderHours(*in.HoursBefore) {
		return dto.ClubReminderSettingsDto{}, ErrReminderHours
	}
	if err := s.queries.UpsertClubReminderSettings(s.ctx, db.UpsertClubReminderSettingsParams{ClubID: clubID, HoursBefore: int32(*in.HoursBefore)}); err != nil {
		return dto.ClubReminderSettingsDto{}, err
	}
	return s.GetSettings(clubID, userID)
}

type reminderEvent struct {
	ID, ClubID, Summary, Location, ClubName string
	Start                                   time.Time
}

// RemindNow reminds all open members of one event (manager action).
func (s *ReminderService) RemindNow(clubID, userID, eventID string) (int, error) {
	if err := s.requireManager(clubID, userID); err != nil {
		return 0, err
	}
	ev, err := s.queries.GetEventForReminder(s.ctx, db.GetEventForReminderParams{ID: eventID, ClubID: clubID})
	if err != nil {
		return 0, err
	}
	if ev.Cancelled {
		return 0, ErrEventCancelled
	}
	return s.remind(reminderEvent{ID: ev.ID, ClubID: ev.ClubID, Summary: ev.Summary, Location: ev.Location.String, ClubName: ev.ClubName, Start: ev.StartDate}, ReminderManual, time.Now().UTC())
}

// RunDue sends the automatic reminders that are due at `now`. Returns how many were sent.
func (s *ReminderService) RunDue(now time.Time) (int, error) {
	events, err := s.queries.ListEventsDueForReminder(s.ctx, db.ListEventsDueForReminderParams{Now: now})
	if err != nil {
		return 0, err
	}
	total := 0
	for _, e := range events {
		n, err := s.remind(reminderEvent{ID: e.ID, ClubID: e.ClubID, Summary: e.Summary, Location: e.Location.String, ClubName: e.ClubName, Start: e.StartDate}, ReminderAuto, now)
		if err != nil {
			s.logf("reminder for event %s failed: %v", e.ID, err)
			continue
		}
		total += n
	}
	return total, nil
}

func (s *ReminderService) remind(ev reminderEvent, mode ReminderMode, now time.Time) (int, error) {
	rows, err := s.queries.ListOpenResponseMembers(s.ctx, ev.ID)
	if err != nil {
		return 0, err
	}
	candidates := make([]ReminderCandidate, 0, len(rows))
	byID := make(map[string]db.ListOpenResponseMembersRow, len(rows))
	for _, r := range rows {
		c := ReminderCandidate{UserID: r.ID}
		if r.RemindedAt.Valid {
			t := r.RemindedAt.Time
			c.RemindedAt = &t
		}
		candidates = append(candidates, c)
		byID[r.ID] = r
	}
	url := s.appURL + "/ui/dashboard"
	sent := 0
	for _, userID := range SelectReminderRecipients(candidates, mode, now) {
		r := byID[userID]
		if s.mailer != nil && strings.TrimSpace(r.Email.String) != "" {
			name := buildDisplayName(r.Firstname.String, r.Lastname.String, r.Username.String, "")
			if err := s.mailer.SendEventReminderEmail(r.Email.String, name, ev.ClubName, ev.Summary, ev.Location, ev.Start, url); err != nil {
				// Do not mark as sent: the next run retries.
				s.logf("reminder mail to %s failed: %v", userID, err)
				continue
			}
		}
		if s.hub != nil {
			s.hub.Publish(userID, NotificationEvent{Type: NotifEventReminder, ClubID: ev.ClubID, EventID: ev.ID, Preview: ev.Summary})
		}
		if err := s.queries.MarkEventReminderSent(s.ctx, db.MarkEventReminderSentParams{EventID: ev.ID, UserID: userID, SentAt: now}); err != nil {
			return sent, err
		}
		sent++
	}
	return sent, nil
}

func (s *ReminderService) logf(format string, args ...any) {
	if s.logger != nil {
		s.logger.Warnf(format, args...)
	}
}

// StartJob runs RunDue every interval in the background for the process lifetime.
func (s *ReminderService) StartJob(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for range ticker.C {
			if n, err := s.RunDue(time.Now().UTC()); err != nil {
				s.logf("reminder job failed: %v", err)
			} else if n > 0 && s.logger != nil {
				s.logger.Infof("sent %d event reminders", n)
			}
		}
	}()
}
