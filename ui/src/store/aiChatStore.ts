import { create } from "zustand";

export interface AiChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    error?: boolean;
}

export interface AiChatSession {
    id: string;
    title: string;
    updatedAt: string;
}

interface AiChatState {
    isOpen: boolean;
    sessions: AiChatSession[];
    activeSessionId: string | null;
    messages: AiChatMessage[];
    streaming: boolean;
    toolStatus: string | null;
    setOpen: (open: boolean) => void;
    setSessions: (sessions: AiChatSession[]) => void;
    setActiveSession: (id: string | null, messages: AiChatMessage[]) => void;
    addMessage: (message: AiChatMessage) => void;
    appendToLastAssistant: (text: string) => void;
    markLastAssistantError: () => void;
    setStreaming: (streaming: boolean) => void;
    setToolStatus: (status: string | null) => void;
}

export const useAiChatStore = create<AiChatState>((set) => ({
    isOpen: false,
    sessions: [],
    activeSessionId: null,
    messages: [],
    streaming: false,
    toolStatus: null,
    setOpen: (isOpen) => set({ isOpen }),
    setSessions: (sessions) => set({ sessions }),
    setActiveSession: (activeSessionId, messages) =>
        set({ activeSessionId, messages, toolStatus: null }),
    addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
    appendToLastAssistant: (text) =>
        set((s) => {
            const messages = [...s.messages];
            const last = messages[messages.length - 1];
            if (last && last.role === "assistant") {
                messages[messages.length - 1] = { ...last, content: last.content + text };
            }
            return { messages };
        }),
    markLastAssistantError: () =>
        set((s) => {
            const messages = [...s.messages];
            const last = messages[messages.length - 1];
            if (last && last.role === "assistant") {
                messages[messages.length - 1] = { ...last, error: true };
            }
            return { messages };
        }),
    setStreaming: (streaming) => set({ streaming }),
    setToolStatus: (toolStatus) => set({ toolStatus }),
}));
