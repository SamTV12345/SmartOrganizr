import { FC, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { apiURL } from "@/src/Keycloak";
import { useKeycloak } from "@/src/Keycloak/useKeycloak";
import { Club } from "@/src/models/Club";
import { ClubChatCreated, ClubChatMessage, ClubChatSummary, ClubMessageCandidate } from "@/src/models/ClubMessage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export const MyMessagesView: FC = () => {
    const user = useKeycloak();
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedClubId, setSelectedClubId] = useState(searchParams.get("clubId") ?? "");
    const [activeChatId, setActiveChatId] = useState("");
    const [newChatRecipient, setNewChatRecipient] = useState("");
    const [newChatContent, setNewChatContent] = useState("");
    const [chatContent, setChatContent] = useState("");

    const { data: clubsData } = useQuery({
        queryKey: ["clubs"],
        queryFn: async () => axios.get<Club[]>(`${apiURL}/v1/clubs/${user.subject}`),
    });

    const clubs = clubsData?.data ?? [];
    const selectedClub = useMemo(() => clubs.find((club) => club.id === selectedClubId), [clubs, selectedClubId]);
    const messagingAllowed = selectedClub?.members_can_send_messages ?? false;

    useEffect(() => {
        if (selectedClubId) {
            return;
        }
        if (clubs.length === 0) {
            return;
        }
        const fromURL = searchParams.get("clubId");
        if (fromURL && clubs.some((club) => club.id === fromURL)) {
            setSelectedClubId(fromURL);
            return;
        }
        setSelectedClubId(clubs[0].id);
    }, [clubs, searchParams, selectedClubId]);

    useEffect(() => {
        if (selectedClubId) {
            setSearchParams({ clubId: selectedClubId });
        }
    }, [selectedClubId, setSearchParams]);

    const { data: candidatesData, refetch: refetchCandidates } = useQuery({
        queryKey: ["club-message-candidates", selectedClubId],
        queryFn: async () => axios.get<ClubMessageCandidate[]>(`${apiURL}/v1/clubs/${selectedClubId}/messages/candidates`),
        enabled: !!selectedClubId && messagingAllowed,
    });

    const { data: chatsData, refetch: refetchChats } = useQuery({
        queryKey: ["club-chats", selectedClubId],
        queryFn: async () => axios.get<ClubChatSummary[]>(`${apiURL}/v1/clubs/${selectedClubId}/messages/chats`),
        enabled: !!selectedClubId && messagingAllowed,
    });

    const chats = chatsData?.data ?? [];

    useEffect(() => {
        if (chats.length === 0) {
            setActiveChatId("");
            return;
        }
        if (!activeChatId || !chats.some((chat) => chat.chat_id === activeChatId)) {
            setActiveChatId(chats[0].chat_id);
        }
    }, [activeChatId, chats]);

    const { data: chatMessagesData, refetch: refetchMessages } = useQuery({
        queryKey: ["club-chat-messages", selectedClubId, activeChatId],
        queryFn: async () => axios.get<ClubChatMessage[]>(`${apiURL}/v1/clubs/${selectedClubId}/messages/chats/${activeChatId}`),
        enabled: !!selectedClubId && !!activeChatId && messagingAllowed,
    });

    const createChatMutation = useMutation({
        mutationFn: async (payload: { recipientUserId: string; content: string }) =>
            axios.post<ClubChatCreated>(`${apiURL}/v1/clubs/${selectedClubId}/messages/chats`, {
                recipient_user_id: payload.recipientUserId,
                content: payload.content,
            }),
        onSuccess: async (response) => {
            setNewChatContent("");
            setNewChatRecipient("");
            await Promise.all([refetchChats(), refetchCandidates()]);
            setActiveChatId(response.data.chat_id);
            await refetchMessages();
        },
    });

    const postMessageMutation = useMutation({
        mutationFn: async (payload: { content: string }) =>
            axios.post(`${apiURL}/v1/clubs/${selectedClubId}/messages/chats/${activeChatId}`, payload),
        onSuccess: async () => {
            setChatContent("");
            await Promise.all([refetchMessages(), refetchChats()]);
        },
    });

    const onCreateChat = () => {
        if (!newChatRecipient) return;
        createChatMutation.mutate({ recipientUserId: newChatRecipient, content: newChatContent.trim() });
    };

    const onSendMessage = () => {
        const content = chatContent.trim();
        if (!activeChatId || content.length === 0) return;
        postMessageMutation.mutate({ content });
    };

    return (
        <div className="space-y-4 p-4 md:p-6">
            <Card>
                <CardHeader className="space-y-2">
                    <CardTitle>Meine Nachrichten</CardTitle>
                    <CardDescription>Starte und verwalte Direktnachrichten innerhalb deiner Vereine.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-[1.5fr_1fr]">
                    <div className="grid gap-2">
                        <Label htmlFor="messages-club-select">Verein</Label>
                        <Select value={selectedClubId} onValueChange={(value) => setSelectedClubId(value)}>
                            <SelectTrigger id="messages-club-select">
                                <SelectValue placeholder="Verein wählen" />
                            </SelectTrigger>
                            <SelectContent>
                                {clubs.map((club) => (
                                    <SelectItem key={club.id} value={club.id}>
                                        {club.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {!messagingAllowed && selectedClub && (
                        <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                            In diesem Verein ist `members_can_send_messages` deaktiviert.
                        </p>
                    )}
                </CardContent>
            </Card>

            {messagingAllowed && selectedClub && (
                <div className="grid gap-4 xl:grid-cols-[1.1fr_1.2fr_1.7fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Neuen Chat starten</CardTitle>
                            <CardDescription>Du kannst nur Mitglieder aus dem gleichen Verein anschreiben.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid gap-2">
                                <Label htmlFor="new-chat-recipient">Empfänger</Label>
                                <Select value={newChatRecipient} onValueChange={setNewChatRecipient}>
                                    <SelectTrigger id="new-chat-recipient">
                                        <SelectValue placeholder="Mitglied wählen" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(candidatesData?.data ?? []).map((candidate) => (
                                            <SelectItem key={candidate.user_id} value={candidate.user_id}>
                                                {candidate.display_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="new-chat-message">Erste Nachricht (optional)</Label>
                                <Textarea
                                    id="new-chat-message"
                                    rows={4}
                                    value={newChatContent}
                                    onChange={(event) => setNewChatContent(event.target.value)}
                                    placeholder="Nachricht eingeben..."
                                />
                            </div>
                            <Button onClick={onCreateChat} disabled={!newChatRecipient || createChatMutation.isPending}>
                                Chat starten
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Chats</CardTitle>
                            <CardDescription>Aktive Direktnachrichten im Verein.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {chats.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Chats vorhanden.</p>}
                            {chats.map((chat) => (
                                <button
                                    key={chat.chat_id}
                                    type="button"
                                    className={`w-full rounded-md border px-3 py-2 text-left ${
                                        chat.chat_id === activeChatId ? "border-accentDark bg-accentDark/10" : "hover:bg-muted/50"
                                    }`}
                                    onClick={() => setActiveChatId(chat.chat_id)}
                                >
                                    <p className="font-medium">{chat.other_display_name}</p>
                                    <p className="line-clamp-1 text-xs text-muted-foreground">{chat.last_message || "Noch keine Nachricht"}</p>
                                </button>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Nachrichten</CardTitle>
                            <CardDescription>
                                {activeChatId ? "Verlauf und neue Nachricht." : "Wähle einen Chat aus oder starte einen neuen Chat."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="h-[360px] space-y-2 overflow-auto rounded-md border p-3">
                                {activeChatId && (chatMessagesData?.data ?? []).length === 0 && (
                                    <p className="text-sm text-muted-foreground">Noch keine Nachrichten in diesem Chat.</p>
                                )}
                                {(chatMessagesData?.data ?? []).map((message) => {
                                    const isOwn = message.sender_user_id === user.subject;
                                    return (
                                        <div
                                            key={message.id}
                                            className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${isOwn ? "ml-auto bg-accentDark text-white" : "bg-muted"}`}
                                        >
                                            <p className={`text-xs ${isOwn ? "text-white/80" : "text-muted-foreground"}`}>{message.sender_display_name}</p>
                                            <p>{message.content}</p>
                                            <p className={`text-[11px] ${isOwn ? "text-white/80" : "text-muted-foreground"}`}>
                                                {message.created_at ? new Date(message.created_at).toLocaleString("de-DE") : ""}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    value={chatContent}
                                    onChange={(event) => setChatContent(event.target.value)}
                                    placeholder="Nachricht schreiben..."
                                    disabled={!activeChatId}
                                />
                                <Button onClick={onSendMessage} disabled={!activeChatId || postMessageMutation.isPending}>
                                    Senden
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};
