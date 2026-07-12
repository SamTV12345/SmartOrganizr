package service

import (
	"api_go/controllers/dto"
	"api_go/db"
	"api_go/models"
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

var ErrNoClubAccess = errors.New("no club access")
var ErrManageForbidden = errors.New("insufficient role permissions")

type ClubEventService struct {
	queries *db.Queries
	ctx     context.Context
	members ClubMemberService
	hub     *NotificationHub
}

func NewClubEventService(queries *db.Queries, members ClubMemberService, hub *NotificationHub) ClubEventService {
	return ClubEventService{queries: queries, ctx: context.Background(), members: members, hub: hub}
}

// canManage mirrors controllers.canManageEvents (Admin/CoAdmin). Kept here to
// avoid a controller->service import cycle.
func canManage(role models.ClubRole) bool {
	return role == models.Admin || role == models.CoAdmin
}

func (s *ClubEventService) requireMember(clubID, userID string) (models.ClubRole, error) {
	role, err := s.members.GetRoleInClub(clubID, userID)
	if err != nil {
		return "", ErrNoClubAccess
	}
	return role, nil
}

func (s *ClubEventService) requireManager(clubID, userID string) error {
	role, err := s.requireMember(clubID, userID)
	if err != nil {
		return err
	}
	if !canManage(role) {
		return ErrManageForbidden
	}
	return nil
}

func parseRFC3339(value string) (sql.NullTime, error) {
	v := strings.TrimSpace(value)
	if v == "" {
		return sql.NullTime{}, nil
	}
	t, err := time.Parse(time.RFC3339, v)
	if err != nil {
		return sql.NullTime{}, err
	}
	return sql.NullTime{Time: t, Valid: true}, nil
}

func normalizeEventType(t string) string {
	switch strings.ToUpper(strings.TrimSpace(t)) {
	case "CONCERT":
		return "CONCERT"
	case "OTHER":
		return "OTHER"
	default:
		return "REHEARSAL"
	}
}

func normalizeStatus(s string) (string, error) {
	switch strings.ToUpper(strings.TrimSpace(s)) {
	case "YES":
		return "YES", nil
	case "NO":
		return "NO", nil
	case "MAYBE":
		return "MAYBE", nil
	default:
		return "", errors.New("status must be YES, NO or MAYBE")
	}
}

func nullableString(v *string) sql.NullString {
	if v == nil || strings.TrimSpace(*v) == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: *v, Valid: true}
}

func nullableFloat(v *float64) sql.NullFloat64 {
	if v == nil {
		return sql.NullFloat64{}
	}
	return sql.NullFloat64{Float64: *v, Valid: true}
}

// Create inserts a new event (manager only) and notifies all club members.
func (s *ClubEventService) Create(clubID, userID string, in dto.ClubEventUpsertDto) (dto.ClubEventDto, error) {
	if err := s.requireManager(clubID, userID); err != nil {
		return dto.ClubEventDto{}, err
	}
	start, err := parseRFC3339(in.StartDate)
	if err != nil || !start.Valid {
		return dto.ClubEventDto{}, errors.New("startDate must be a valid RFC3339 timestamp")
	}
	var end sql.NullTime
	if in.EndDate != nil {
		end, err = parseRFC3339(*in.EndDate)
		if err != nil {
			return dto.ClubEventDto{}, errors.New("endDate must be a valid RFC3339 timestamp")
		}
	}
	if strings.TrimSpace(in.Summary) == "" {
		return dto.ClubEventDto{}, errors.New("summary is required")
	}
	sectionFk, err := s.resolveSection(clubID, in.SectionID)
	if err != nil {
		return dto.ClubEventDto{}, err
	}
	id := uuid.NewString()
	if err := s.queries.CreateClubEvent(s.ctx, db.CreateClubEventParams{
		ID:              id,
		ClubID:          clubID,
		Summary:         in.Summary,
		Description:     nullableString(in.Description),
		Location:        nullableString(in.Location),
		GeoDateX:        nullableFloat(in.GeoDateX),
		GeoDateY:        nullableFloat(in.GeoDateY),
		EventType:       normalizeEventType(in.EventType),
		StartDate:       start.Time,
		EndDate:         end,
		CreatedByUserID: userID,
		SectionFk:       sectionFk,
	}); err != nil {
		return dto.ClubEventDto{}, err
	}
	s.notifyMembers(clubID, id, NotifClubEventCreated, in.Summary, sectionFk)
	return s.getOne(clubID, userID, id)
}

// resolveSection validates an optional section id against the club.
func (s *ClubEventService) resolveSection(clubID string, sectionID *string) (sql.NullString, error) {
	if sectionID == nil || *sectionID == "" {
		return sql.NullString{}, nil
	}
	if _, err := s.queries.FindClubSection(s.ctx, db.FindClubSectionParams{ID: *sectionID, ClubID: clubID}); err != nil {
		return sql.NullString{}, errors.New("section not found in this club")
	}
	return db.NewSQLNullString(*sectionID), nil
}

// Update edits an event (manager only).
func (s *ClubEventService) Update(clubID, userID, eventID string, in dto.ClubEventUpsertDto) (dto.ClubEventDto, error) {
	if err := s.requireManager(clubID, userID); err != nil {
		return dto.ClubEventDto{}, err
	}
	if strings.TrimSpace(in.Summary) == "" {
		return dto.ClubEventDto{}, errors.New("summary is required")
	}
	start, err := parseRFC3339(in.StartDate)
	if err != nil || !start.Valid {
		return dto.ClubEventDto{}, errors.New("startDate must be a valid RFC3339 timestamp")
	}
	var end sql.NullTime
	if in.EndDate != nil {
		end, err = parseRFC3339(*in.EndDate)
		if err != nil {
			return dto.ClubEventDto{}, errors.New("endDate must be a valid RFC3339 timestamp")
		}
	}
	sectionFk, err := s.resolveSection(clubID, in.SectionID)
	if err != nil {
		return dto.ClubEventDto{}, err
	}
	if err := s.queries.UpdateClubEvent(s.ctx, db.UpdateClubEventParams{
		Summary:     in.Summary,
		Description: nullableString(in.Description),
		Location:    nullableString(in.Location),
		GeoDateX:    nullableFloat(in.GeoDateX),
		GeoDateY:    nullableFloat(in.GeoDateY),
		EventType:   normalizeEventType(in.EventType),
		StartDate:   start.Time,
		EndDate:     end,
		SectionFk:   sectionFk,
		ID:          eventID,
		ClubID:      clubID,
	}); err != nil {
		return dto.ClubEventDto{}, err
	}
	return s.getOne(clubID, userID, eventID)
}

// Cancel soft-cancels an event and notifies members.
func (s *ClubEventService) Cancel(clubID, userID, eventID string) error {
	if err := s.requireManager(clubID, userID); err != nil {
		return err
	}
	ev, err := s.queries.GetClubEventByID(s.ctx, db.GetClubEventByIDParams{ID: eventID, ClubID: clubID})
	if err != nil {
		return errors.New("event not found")
	}
	if err := s.queries.SoftCancelClubEvent(s.ctx, db.SoftCancelClubEventParams{ID: eventID, ClubID: clubID}); err != nil {
		return err
	}
	s.notifyMembers(clubID, eventID, NotifClubEventCancelled, ev.Summary, ev.SectionFk)
	return nil
}

// Delete permanently removes an event (manager only).
func (s *ClubEventService) Delete(clubID, userID, eventID string) error {
	if err := s.requireManager(clubID, userID); err != nil {
		return err
	}
	return s.queries.DeleteClubEvent(s.ctx, db.DeleteClubEventParams{ID: eventID, ClubID: clubID})
}

// ListForClub returns a club's upcoming events with the caller's own response.
func (s *ClubEventService) ListForClub(clubID, userID string, since time.Time) ([]dto.ClubEventDto, error) {
	if _, err := s.requireMember(clubID, userID); err != nil {
		return nil, err
	}
	rows, err := s.queries.ListClubEventsForClub(s.ctx, db.ListClubEventsForClubParams{
		UserID: userID, ClubID: clubID, Since: since,
	})
	if err != nil {
		return nil, err
	}
	out := make([]dto.ClubEventDto, 0, len(rows))
	for _, r := range rows {
		out = append(out, dto.ClubEventDto{
			ID:             r.ID,
			ClubID:         r.ClubID,
			Summary:        r.Summary,
			Description:    r.Description.String,
			Location:       r.Location.String,
			GeoDateX:       nullFloatPtr(r.GeoDateX),
			GeoDateY:       nullFloatPtr(r.GeoDateY),
			EventType:      r.EventType,
			StartDate:      r.StartDate.Format(time.RFC3339),
			EndDate:        nullTimeRFC(r.EndDate),
			Cancelled:      r.Cancelled,
			SectionID:      r.SectionFk.String,
			SectionName:    r.SectionName.String,
			MyStatus:       r.MyStatus.String,
			MyReason:       r.MyReason.String,
			YesCount:       int(r.YesCount),
			NoCount:        int(r.NoCount),
			MaybeCount:     int(r.MaybeCount),
			UndecidedCount: undecided(r.MemberCount, r.YesCount, r.NoCount, r.MaybeCount),
		})
	}
	return out, nil
}

// ListForUser returns native events across all of the caller's clubs.
func (s *ClubEventService) ListForUser(userID string, since time.Time) ([]dto.ClubEventDto, error) {
	rows, err := s.queries.ListClubEventsForUser(s.ctx, db.ListClubEventsForUserParams{
		UserID: userID, Since: since,
	})
	if err != nil {
		return nil, err
	}
	out := make([]dto.ClubEventDto, 0, len(rows))
	for _, r := range rows {
		out = append(out, dto.ClubEventDto{
			ID:             r.ID,
			ClubID:         r.ClubID,
			ClubName:       r.ClubName,
			Summary:        r.Summary,
			Description:    r.Description.String,
			Location:       r.Location.String,
			GeoDateX:       nullFloatPtr(r.GeoDateX),
			GeoDateY:       nullFloatPtr(r.GeoDateY),
			EventType:      r.EventType,
			StartDate:      r.StartDate.Format(time.RFC3339),
			EndDate:        nullTimeRFC(r.EndDate),
			Cancelled:      r.Cancelled,
			SectionID:      r.SectionFk.String,
			SectionName:    r.SectionName.String,
			MyStatus:       r.MyStatus.String,
			MyReason:       r.MyReason.String,
			YesCount:       int(r.YesCount),
			NoCount:        int(r.NoCount),
			MaybeCount:     int(r.MaybeCount),
			UndecidedCount: undecided(r.MemberCount, r.YesCount, r.NoCount, r.MaybeCount),
		})
	}
	return out, nil
}

// ListForUserFeed returns raw event rows across all of the user's clubs for
// the ICS calendar feed. Unlike ListForUser it keeps cancelled events so the
// feed can emit STATUS:CANCELLED instead of silently dropping them.
func (s *ClubEventService) ListForUserFeed(userID string, since time.Time) ([]db.ListClubEventsForUserFeedRow, error) {
	return s.queries.ListClubEventsForUserFeed(s.ctx, db.ListClubEventsForUserFeedParams{
		UserID: userID, Since: since,
	})
}

// Respond upserts the caller's RSVP and notifies managers.
func (s *ClubEventService) Respond(clubID, userID, eventID string, in dto.ClubEventResponseDto) error {
	if _, err := s.requireMember(clubID, userID); err != nil {
		return err
	}
	ev, err := s.queries.GetClubEventByID(s.ctx, db.GetClubEventByIDParams{ID: eventID, ClubID: clubID})
	if err != nil {
		return errors.New("event not found")
	}
	if ev.Cancelled {
		return errors.New("cannot respond to a cancelled event")
	}
	if ev.SectionFk.Valid {
		// Section events collect responses from that section only — a Leiter
		// who doesn't play in the register isn't part of the audience either.
		participant, err := s.members.GetParticipant(clubID, userID)
		if err != nil || participant.SectionFk.String != ev.SectionFk.String {
			return errors.New("this event is limited to a section you are not part of")
		}
	}
	status, err := normalizeStatus(in.Status)
	if err != nil {
		return err
	}
	if err := s.queries.UpsertClubEventResponse(s.ctx, db.UpsertClubEventResponseParams{
		EventID: eventID, UserID: userID, Status: status, Reason: nullableString(in.Reason),
	}); err != nil {
		return err
	}
	s.notifyManagers(clubID, eventID, userID)
	return nil
}

// Attendance returns the matrix for an event, filtered by club visibility.
func (s *ClubEventService) Attendance(clubID, userID, eventID string) (dto.AttendanceDto, error) {
	role, err := s.requireMember(clubID, userID)
	if err != nil {
		return dto.AttendanceDto{}, err
	}
	ev, err := s.queries.GetClubEventByID(s.ctx, db.GetClubEventByIDParams{ID: eventID, ClubID: clubID})
	if err != nil {
		return dto.AttendanceDto{}, errors.New("event not found")
	}
	club, err := s.queries.FindClubByID(s.ctx, clubID)
	if err != nil {
		return dto.AttendanceDto{}, err
	}
	members, err := s.members.GetAllMembersForClub(clubID)
	if err != nil {
		return dto.AttendanceDto{}, err
	}
	responses, err := s.queries.ListClubEventResponses(s.ctx, eventID)
	if err != nil {
		return dto.AttendanceDto{}, err
	}

	// Section events only concern that section's members: the matrix, the
	// counts and the undecided denominator are all scoped to the audience.
	audience := make([]models.ClubMember, 0, len(*members))
	var viewer models.ClubMember
	for _, m := range *members {
		if m.User.UserId == userID {
			viewer = m
		}
		if !ev.SectionFk.Valid || m.SectionID == ev.SectionFk.String {
			audience = append(audience, m)
		}
	}
	inAudience := make(map[string]bool, len(audience))
	for _, m := range audience {
		inAudience[m.User.UserId] = true
	}

	// Index responses by user; count only audience responses (targeting may
	// have changed after people responded).
	byUser := make(map[string]db.ListClubEventResponsesRow, len(responses))
	var yes, no, maybe int
	for _, r := range responses {
		if !inAudience[r.UserID] {
			continue
		}
		byUser[r.UserID] = r
		switch r.Status {
		case "YES":
			yes++
		case "NO":
			no++
		case "MAYBE":
			maybe++
		}
	}
	undecidedCount := len(audience) - (yes + no + maybe)
	if undecidedCount < 0 {
		undecidedCount = 0
	}
	result := dto.AttendanceDto{
		EventID:        eventID,
		YesCount:       yes,
		NoCount:        no,
		MaybeCount:     maybe,
		UndecidedCount: undecidedCount,
		Rows:           []dto.AttendanceRowDto{},
	}

	isManager := canManage(role)
	for _, m := range audience {
		own := m.User.UserId == userID
		if !own && !rowVisible(club.Club.FeedbackVisibility, isManager, viewer, m) {
			continue
		}
		row := dto.AttendanceRowDto{
			UserID:      m.User.UserId,
			DisplayName: buildDisplayName(m.User.Firstname, m.User.Lastname, m.User.Username, m.User.UserId),
			Status:      "UNDECIDED",
		}
		if r, ok := byUser[m.User.UserId]; ok {
			row.Status = r.Status
			if own || rowVisible(club.Club.ReasonVisibility, isManager, viewer, m) {
				row.Reason = r.Reason.String
			}
		}
		result.Rows = append(result.Rows, row)
	}
	return result, nil
}

// rowVisible reports whether the viewer may see another member's row data
// given a club visibility token (as stored by the club create/settings form).
// Unknown, non-empty tokens fail safe to manager-only.
func rowVisible(token string, isManager bool, viewer, row models.ClubMember) bool {
	switch strings.ToLower(strings.TrimSpace(token)) {
	case "", "all", "all-members":
		return true
	case "leaders-and-authorized":
		return isManager || viewer.Authorized
	case "only-authorized":
		// Strictly the manager-granted flag: even a LEITER without it sees
		// only their own row (they can grant themselves the flag if needed).
		return viewer.Authorized
	case "managers":
		return isManager
	case "section":
		// Registerführer see the members of their own section; managers all.
		if isManager {
			return true
		}
		return viewer.SectionLeader && viewer.SectionID != "" && viewer.SectionID == row.SectionID
	case "self":
		return false
	default:
		return isManager
	}
}

// GetOne returns a single event for a club member, including cancelled or past
// events that the since-filtered lists no longer contain.
func (s *ClubEventService) GetOne(clubID, userID, eventID string) (dto.ClubEventDto, error) {
	return s.getOne(clubID, userID, eventID)
}

func (s *ClubEventService) getOne(clubID, userID, eventID string) (dto.ClubEventDto, error) {
	events, err := s.ListForClub(clubID, userID, time.Unix(0, 0))
	if err != nil {
		return dto.ClubEventDto{}, err
	}
	for _, e := range events {
		if e.ID == eventID {
			return e, nil
		}
	}
	ev, err := s.queries.GetClubEventByID(s.ctx, db.GetClubEventByIDParams{ID: eventID, ClubID: clubID})
	if err != nil {
		return dto.ClubEventDto{}, err
	}
	out := dto.ClubEventDto{
		ID: ev.ID, ClubID: ev.ClubID, Summary: ev.Summary, Description: ev.Description.String,
		Location: ev.Location.String, GeoDateX: nullFloatPtr(ev.GeoDateX), GeoDateY: nullFloatPtr(ev.GeoDateY),
		EventType: ev.EventType, StartDate: ev.StartDate.Format(time.RFC3339), EndDate: nullTimeRFC(ev.EndDate),
		Cancelled: ev.Cancelled, SectionID: ev.SectionFk.String,
	}
	if ev.SectionFk.Valid {
		if section, err := s.queries.FindClubSection(s.ctx, db.FindClubSectionParams{ID: ev.SectionFk.String, ClubID: clubID}); err == nil {
			out.SectionName = section.Name
		}
	}
	return out, nil
}

// notifyMembers publishes to the event's audience: everyone for whole-club
// events, the section's members plus managers for section events.
func (s *ClubEventService) notifyMembers(clubID, eventID, notifType, preview string, sectionFk sql.NullString) {
	if s.hub == nil {
		return
	}
	members, err := s.members.GetAllMembersForClub(clubID)
	if err != nil {
		return
	}
	for _, m := range *members {
		if sectionFk.Valid && m.SectionID != sectionFk.String && !canManage(m.Role) {
			continue
		}
		s.hub.Publish(m.User.UserId, NotificationEvent{
			Type: notifType, ClubID: clubID, EventID: eventID, Preview: preview,
		})
	}
}

func (s *ClubEventService) notifyManagers(clubID, eventID, responderID string) {
	if s.hub == nil {
		return
	}
	members, err := s.members.GetAllMembersForClub(clubID)
	if err != nil {
		return
	}
	for _, m := range *members {
		if canManage(m.Role) && m.User.UserId != responderID {
			s.hub.Publish(m.User.UserId, NotificationEvent{
				Type: NotifClubEventResponse, ClubID: clubID, EventID: eventID,
			})
		}
	}
}

func undecided(memberCount, yes, no, maybe int64) int {
	v := memberCount - (yes + no + maybe)
	if v < 0 {
		return 0
	}
	return int(v)
}

func nullFloatPtr(v sql.NullFloat64) *float64 {
	if !v.Valid {
		return nil
	}
	f := v.Float64
	return &f
}

func nullTimeRFC(v sql.NullTime) string {
	if !v.Valid {
		return ""
	}
	return v.Time.Format(time.RFC3339)
}
