import { authFetch } from "../../api/client";
import { apiURL } from "../../Keycloak";

export type ChatStreamEvent =
    | { type: "token"; text: string }
    | { type: "tool"; status: string }
    | { type: "navigate"; path: string }
    | { type: "done" }
    | { type: "error"; message: string };

// POST + ReadableStream because EventSource cannot send a POST body or
// the Authorization header.
export async function streamChatMessage(
    sessionId: string,
    message: string,
    onEvent: (event: ChatStreamEvent) => void,
    signal?: AbortSignal,
): Promise<void> {
    let response: Response;
    try {
        response = await authFetch(`${apiURL}/v1/ai/chat/sessions/${sessionId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
            body: JSON.stringify({ message }),
            signal,
        });
    } catch (err) {
        if ((err as DOMException)?.name === "AbortError") return;
        onEvent({ type: "error", message: "network" });
        return;
    }
    if (!response.ok || !response.body) {
        onEvent({ type: "error", message: `HTTP ${response.status}` });
        return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let terminal = false;

    while (true) {
        let value: Uint8Array | undefined;
        let done: boolean;
        try {
            ({ value, done } = await reader.read());
        } catch (err) {
            if ((err as DOMException)?.name === "AbortError") return;
            throw err;
        }
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sep = buffer.indexOf("\n\n");
        while (sep !== -1) {
            const frame = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            const lines = frame.split("\n");
            const eventLine = lines.find((l) => l.startsWith("event:"));
            const dataLine = lines.find((l) => l.startsWith("data:"));
            if (eventLine && dataLine) {
                const type = eventLine.slice("event:".length).trim();
                let data: Record<string, string> = {};
                try {
                    data = JSON.parse(dataLine.slice("data:".length).trim());
                } catch {
                    // ignore malformed frame
                }
                if (type === "done" || type === "error") terminal = true;
                onEvent({ type, ...data } as ChatStreamEvent);
            }
            sep = buffer.indexOf("\n\n");
        }
    }
    if (!terminal && !signal?.aborted) {
        onEvent({ type: "error", message: "stream ended unexpectedly" });
    }
}
