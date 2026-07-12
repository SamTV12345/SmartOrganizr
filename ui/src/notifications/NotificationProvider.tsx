import { FC, ReactNode, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/src/api/client";
import { apiURL } from "@/src/Keycloak";
import { useKeycloak } from "@/src/Keycloak/useKeycloak";

const RECONNECT_DELAY_MS = 5000;

// NotificationProvider opens an authenticated Server-Sent Events stream and refreshes
// the relevant React Query caches whenever a notification arrives, so badges and chats
// update live. EventSource can't send the Keycloak bearer header, so we read the stream
// via fetch + ReadableStream and reconnect with a fixed backoff.
export const NotificationProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const queryClient = useQueryClient();
    const user = useKeycloak();

    useEffect(() => {
        if (!user.subject) {
            return;
        }
        let cancelled = false;
        let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
        let retryTimer: ReturnType<typeof setTimeout> | null = null;

        const refreshChats = () => {
            queryClient.invalidateQueries({ queryKey: ["club-chats"] });
            queryClient.invalidateQueries({ queryKey: ["club-chat-messages"] });
        };
        const refreshClubEvents = () => {
            queryClient.invalidateQueries({ queryKey: ["get", "/v1/club-events"] });
            queryClient.invalidateQueries({ queryKey: ["get", "/v1/clubs/{clubId}/events"] });
            queryClient.invalidateQueries({ queryKey: ["get", "/v1/clubs/{clubId}/events/{eventId}/attendance"] });
        };
        const refreshPinboard = (clubId?: string) => {
            queryClient.invalidateQueries({
                queryKey: clubId ? ["club-pinboard", clubId] : ["club-pinboard"],
            });
            queryClient.invalidateQueries({ queryKey: ["pinboard-recent"] });
        };

        const refresh = (payload: string) => {
            queryClient.invalidateQueries({ queryKey: ["unread-summary"] });
            let event: { type?: string; clubId?: string } = {};
            try {
                event = JSON.parse(payload);
            } catch {
                // not JSON (e.g. keepalive) — refresh everything below
            }
            switch (event.type) {
                case "message":
                    refreshChats();
                    break;
                case "club_event_created":
                case "club_event_cancelled":
                case "club_event_response":
                    refreshClubEvents();
                    break;
                case "pinboard_post":
                    refreshPinboard(event.clubId);
                    break;
                default:
                    refreshChats();
                    refreshClubEvents();
                    refreshPinboard(event.clubId);
            }
        };

        const scheduleReconnect = () => {
            if (cancelled) return;
            retryTimer = setTimeout(connect, RECONNECT_DELAY_MS);
        };

        const connect = async () => {
            try {
                const response = await authFetch(`${apiURL}/v1/notifications/stream`, {
                    headers: { Accept: "text/event-stream" },
                });
                if (!response.ok || !response.body) {
                    scheduleReconnect();
                    return;
                }
                reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";
                while (!cancelled) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    let separator = buffer.indexOf("\n\n");
                    while (separator !== -1) {
                        const frame = buffer.slice(0, separator);
                        buffer = buffer.slice(separator + 2);
                        const dataLine = frame.split("\n").find((line) => line.startsWith("data:"));
                        if (dataLine) {
                            refresh(dataLine.slice("data:".length).trim());
                        }
                        separator = buffer.indexOf("\n\n");
                    }
                }
            } catch {
                // network error — fall through to reconnect
            }
            if (!cancelled) {
                scheduleReconnect();
            }
        };

        connect();

        return () => {
            cancelled = true;
            if (retryTimer) {
                clearTimeout(retryTimer);
            }
            if (reader) {
                reader.cancel().catch(() => {});
            }
        };
    }, [user.subject, queryClient]);

    return <>{children}</>;
};
