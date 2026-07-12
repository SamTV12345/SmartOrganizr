package service

import "sync"

// NotificationEvent is pushed to a connected client over SSE.
type NotificationEvent struct {
	Type    string `json:"type"`
	ClubID  string `json:"clubId"`
	ChatID  string `json:"chatId,omitempty"`
	PostID  string `json:"postId,omitempty"`
	EventID string `json:"eventId,omitempty"`
	Preview string `json:"preview,omitempty"`
}

const (
	NotifClubEventCreated   = "club_event_created"
	NotifClubEventCancelled = "club_event_cancelled"
	NotifClubEventResponse  = "club_event_response"
	NotifPinboardPost       = "pinboard_post"
)

// NotificationHub is an in-process pub/sub keyed by user id. A user may have
// several connected clients (channels); each gets every event for that user.
type NotificationHub struct {
	mu          sync.RWMutex
	subscribers map[string]map[chan NotificationEvent]struct{}
}

func NewNotificationHub() *NotificationHub {
	return &NotificationHub{
		subscribers: make(map[string]map[chan NotificationEvent]struct{}),
	}
}

// Subscribe registers a buffered channel for the user and returns it together
// with an idempotent unsubscribe function that closes the channel.
func (h *NotificationHub) Subscribe(userID string) (<-chan NotificationEvent, func()) {
	ch := make(chan NotificationEvent, 16)
	h.mu.Lock()
	if h.subscribers[userID] == nil {
		h.subscribers[userID] = make(map[chan NotificationEvent]struct{})
	}
	h.subscribers[userID][ch] = struct{}{}
	h.mu.Unlock()

	var once sync.Once
	unsubscribe := func() {
		once.Do(func() {
			h.mu.Lock()
			if subs, ok := h.subscribers[userID]; ok {
				delete(subs, ch)
				if len(subs) == 0 {
					delete(h.subscribers, userID)
				}
			}
			close(ch)
			h.mu.Unlock()
		})
	}
	return ch, unsubscribe
}

// Publish delivers an event to all of the user's channels. Delivery is
// non-blocking: if a channel's buffer is full the event is dropped (the client
// re-syncs via REST on reconnect), so a slow consumer never blocks publishers.
func (h *NotificationHub) Publish(userID string, event NotificationEvent) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for ch := range h.subscribers[userID] {
		select {
		case ch <- event:
		default:
		}
	}
}
