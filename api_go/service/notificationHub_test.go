package service

import (
	"testing"
	"time"
)

func TestNotificationHubDeliversToSubscriber(t *testing.T) {
	hub := NewNotificationHub()
	ch, unsubscribe := hub.Subscribe("u1")
	defer unsubscribe()

	hub.Publish("u1", NotificationEvent{Type: "message", ClubID: "c1", Preview: "hi"})

	select {
	case event := <-ch:
		if event.Type != "message" || event.ClubID != "c1" || event.Preview != "hi" {
			t.Fatalf("unexpected event: %+v", event)
		}
	case <-time.After(time.Second):
		t.Fatal("expected an event but none arrived")
	}
}

func TestNotificationHubDoesNotLeakToOtherUsers(t *testing.T) {
	hub := NewNotificationHub()
	ch1, unsubscribe1 := hub.Subscribe("u1")
	defer unsubscribe1()
	_, unsubscribe2 := hub.Subscribe("u2")
	defer unsubscribe2()

	hub.Publish("u2", NotificationEvent{Type: "message"})

	select {
	case <-ch1:
		t.Fatal("u1 must not receive an event published to u2")
	case <-time.After(100 * time.Millisecond):
	}
}

func TestNotificationHubUnsubscribeStopsDelivery(t *testing.T) {
	hub := NewNotificationHub()
	ch, unsubscribe := hub.Subscribe("u1")
	unsubscribe()

	// Publishing after unsubscribe must not panic and the channel must be closed.
	hub.Publish("u1", NotificationEvent{Type: "message"})
	if _, open := <-ch; open {
		t.Fatal("channel should be closed after unsubscribe")
	}
}
