import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, Plus, SendHorizontal, Trash2, X } from "lucide-react";
import { authFetch } from "../../api/client";
import { apiURL } from "../../Keycloak";
import { AiChatMessage, AiChatSession, useAiChatStore } from "../../store/aiChatStore";
import { streamChatMessage } from "./streamChat";

export const AIChatPanel = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const {
        sessions, activeSessionId, messages, streaming, toolStatus,
        setOpen, setSessions, setActiveSession, addMessage,
        appendToLastAssistant, markLastAssistantError, setStreaming, setToolStatus,
    } = useAiChatStore();
    const [input, setInput] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    const refreshSessions = async () => {
        const resp = await authFetch(`${apiURL}/v1/ai/chat/sessions`);
        if (resp.ok) {
            setSessions((await resp.json()) as AiChatSession[]);
        }
    };

    useEffect(() => {
        refreshSessions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, toolStatus]);

    useEffect(() => {
        return () => {
            abortRef.current?.abort();
        };
    }, []);

    const openSession = async (sessionId: string) => {
        const resp = await authFetch(`${apiURL}/v1/ai/chat/sessions/${sessionId}/messages`);
        if (!resp.ok) return;
        const raw = (await resp.json()) as { id: number; role: "user" | "assistant"; content: string }[];
        setActiveSession(sessionId, raw.map((m) => ({ id: String(m.id), role: m.role, content: m.content })));
    };

    const deleteSession = async (sessionId: string) => {
        await authFetch(`${apiURL}/v1/ai/chat/sessions/${sessionId}`, { method: "DELETE" });
        if (sessionId === activeSessionId) {
            setActiveSession(null, []);
        }
        refreshSessions();
    };

    const sendMessage = async (e: FormEvent) => {
        e.preventDefault();
        const text = input.trim();
        if (!text || streaming) return;
        setInput("");

        let sessionId = activeSessionId;
        if (!sessionId) {
            const resp = await authFetch(`${apiURL}/v1/ai/chat/sessions`, { method: "POST" });
            if (!resp.ok) return;
            sessionId = ((await resp.json()) as AiChatSession).id;
            setActiveSession(sessionId, []);
        }

        addMessage({ id: crypto.randomUUID(), role: "user", content: text });
        addMessage({ id: crypto.randomUUID(), role: "assistant", content: "" });
        setStreaming(true);

        const controller = new AbortController();
        abortRef.current = controller;

        await streamChatMessage(sessionId, text, (event) => {
            switch (event.type) {
                case "token":
                    if (typeof event.text === "string") appendToLastAssistant(event.text);
                    break;
                case "tool":
                    if (typeof event.status === "string") setToolStatus(t("aiChat.searching", { query: event.status }));
                    break;
                case "navigate":
                    if (typeof event.path === "string") navigate(event.path);
                    break;
                case "done":
                    setToolStatus(null);
                    refreshSessions();
                    break;
                case "error":
                    setToolStatus(null);
                    markLastAssistantError();
                    appendToLastAssistant(t("aiChat.error"));
                    break;
            }
        }, controller.signal);
        abortRef.current = null;
        setStreaming(false);
    };

    return (
        <div className="flex h-[32rem] w-96 flex-col overflow-hidden rounded-lg bg-gray-700 text-white shadow-xl">
            <div className="flex items-center gap-2 border-b border-gray-600 p-3">
                <span className="flex-1 font-semibold">{t("aiChat.title")}</span>
                <button type="button" title={t("aiChat.newChat")}
                        onClick={() => setActiveSession(null, [])}>
                    <Plus className="h-5 w-5" />
                </button>
                <button type="button" title={t("aiChat.close")} onClick={() => setOpen(false)}>
                    <X className="h-5 w-5" />
                </button>
            </div>

            {sessions.length > 0 && (
                <div className="flex gap-1 overflow-x-auto border-b border-gray-600 p-2">
                    {sessions.map((s) => (
                        <div key={s.id}
                             className={`flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs ${
                                 s.id === activeSessionId ? "bg-gray-500" : "bg-gray-600"}`}>
                            <button type="button" className="max-w-40 truncate"
                                    onClick={() => openSession(s.id)}>
                                {s.title || t("aiChat.newChat")}
                            </button>
                            <button type="button" title={t("aiChat.deleteChat")}
                                    onClick={() => deleteSession(s.id)}>
                                <Trash2 className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {messages.length === 0 && (
                    <p className="text-sm text-gray-300">{t("aiChat.empty")}</p>
                )}
                {messages.map((m: AiChatMessage) => (
                    <div key={m.id}
                         className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                             m.role === "user"
                                 ? "ml-auto bg-blue-600"
                                 : m.error
                                     ? "bg-red-900"
                                     : "bg-gray-600"}`}>
                        {m.content}
                    </div>
                ))}
                {toolStatus && (
                    <p className="flex items-center gap-2 text-xs text-gray-300">
                        <Loader2 className="h-3 w-3 animate-spin" /> {toolStatus}
                    </p>
                )}
                <div ref={bottomRef} />
            </div>

            <form onSubmit={sendMessage} className="flex gap-2 border-t border-gray-600 p-3">
                <input
                    className="flex-1 rounded bg-gray-600 px-3 py-2 text-sm outline-none"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t("aiChat.placeholder")}
                    disabled={streaming}
                />
                <button type="submit" title={t("aiChat.send")} disabled={streaming || !input.trim()}>
                    {streaming ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizontal className="h-5 w-5" />}
                </button>
            </form>
        </div>
    );
};
