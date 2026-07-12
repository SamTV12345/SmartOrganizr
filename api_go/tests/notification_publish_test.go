package tests

import (
	"api_go/controllers/dto"
	"api_go/service"
	"testing"
	"time"

	"github.com/gofiber/fiber/v3"
)

// The SSE hub lives inside the router, so publish behavior is tested at the
// service layer: real DB (testQueries), real hub, subscribed channels.
func newHubBackedServices(t *testing.T) (*service.NotificationHub, service.ClubEventService, service.PinboardService) {
	t.Helper()
	hub := service.NewNotificationHub()
	clubService := service.NewClubService(testQueries, service.NewAddressService(testQueries))
	memberService := service.NewClubMemberService(testQueries, clubService)
	eventService := service.NewClubEventService(testQueries, memberService, hub)
	pinboardService := service.NewPinboardService(testQueries, memberService, hub)
	return hub, eventService, pinboardService
}

func expectEvent(t *testing.T, ch <-chan service.NotificationEvent, wantType string) service.NotificationEvent {
	t.Helper()
	select {
	case ev := <-ch:
		if ev.Type != wantType {
			t.Fatalf("expected notification type %q, got %+v", wantType, ev)
		}
		return ev
	case <-time.After(2 * time.Second):
		t.Fatalf("expected %q notification, got none", wantType)
		return service.NotificationEvent{}
	}
}

func expectNoEvent(t *testing.T, ch <-chan service.NotificationEvent) {
	t.Helper()
	select {
	case ev := <-ch:
		t.Fatalf("expected no notification, got %+v", ev)
	case <-time.After(150 * time.Millisecond):
	}
}

func TestClubEventCreatePublishesToMembers(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	seedClubMember(t, clubID, "listener", "MITGLIED")

	hub, eventService, _ := newHubBackedServices(t)
	memberCh, unsubMember := hub.Subscribe("listener")
	defer unsubMember()
	creatorCh, unsubCreator := hub.Subscribe("12345")
	defer unsubCreator()

	start := time.Now().Add(24 * time.Hour).Format(time.RFC3339)
	created, err := eventService.Create(clubID, "12345", dto.ClubEventUpsertDto{
		Summary: "Probe", EventType: "REHEARSAL", StartDate: start,
	})
	if err != nil {
		t.Fatalf("create event: %v", err)
	}

	ev := expectEvent(t, memberCh, "club_event_created")
	if ev.ClubID != clubID || ev.EventID != created.ID || ev.Preview != "Probe" {
		t.Fatalf("unexpected payload: %+v", ev)
	}
	// The creating manager is a member too and gets the event as well.
	expectEvent(t, creatorCh, "club_event_created")

	// RSVP by the member notifies managers, not the responder.
	if err := eventService.Respond(clubID, "listener", created.ID, dto.ClubEventResponseDto{Status: "YES"}); err != nil {
		t.Fatalf("respond: %v", err)
	}
	expectEvent(t, creatorCh, "club_event_response")
	expectNoEvent(t, memberCh)
}

func TestSectionEventCreatePublishesToSectionAndManagersOnly(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	flutes := createSection(t, app, clubID, "Flöten")
	seedClubMember(t, clubID, "flutist", "MITGLIED")
	seedClubMember(t, clubID, "clarinetist", "MITGLIED")
	assignSection(t, app, clubID, "flutist", &flutes, false, fiber.StatusNoContent)

	hub, eventService, _ := newHubBackedServices(t)
	flutistCh, unsub1 := hub.Subscribe("flutist")
	defer unsub1()
	clarinetistCh, unsub2 := hub.Subscribe("clarinetist")
	defer unsub2()
	managerCh, unsub3 := hub.Subscribe("12345")
	defer unsub3()

	start := time.Now().Add(24 * time.Hour).Format(time.RFC3339)
	if _, err := eventService.Create(clubID, "12345", dto.ClubEventUpsertDto{
		Summary: "Registerprobe", EventType: "REHEARSAL", StartDate: start, SectionID: &flutes,
	}); err != nil {
		t.Fatalf("create section event: %v", err)
	}

	expectEvent(t, flutistCh, "club_event_created")
	expectEvent(t, managerCh, "club_event_created") // managers always notified
	expectNoEvent(t, clarinetistCh)                 // other sections stay quiet
}

func TestPinboardCreatePublishesToOtherMembers(t *testing.T) {
	app := SetupTest(t)
	clubID := createClubForTest(t, app)
	seedClubMember(t, clubID, "reader", "MITGLIED")

	hub, _, pinboardService := newHubBackedServices(t)
	readerCh, unsubReader := hub.Subscribe("reader")
	defer unsubReader()
	authorCh, unsubAuthor := hub.Subscribe("12345")
	defer unsubAuthor()

	post, err := pinboardService.Create(clubID, "12345", "Hallo", "Inhalt", false)
	if err != nil {
		t.Fatalf("create post: %v", err)
	}

	ev := expectEvent(t, readerCh, "pinboard_post")
	if ev.ClubID != clubID || ev.PostID != post.ID || ev.Preview != "Hallo" {
		t.Fatalf("unexpected payload: %+v", ev)
	}
	// The author does not get notified about their own post.
	expectNoEvent(t, authorCh)
}
