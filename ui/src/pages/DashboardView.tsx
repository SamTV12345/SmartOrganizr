import { FC, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { $api, http as axios } from "@/src/api/client";
import { apiURL } from "@/src/Keycloak";
import { useKeycloak } from "@/src/Keycloak/useKeycloak";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Club } from "@/src/models/Club";
import { EventModel } from "@/src/models/EventModel";
import { PinboardPost } from "@/src/models/Pinboard";
import { useUnreadSummary } from "@/src/notifications/useUnreadSummary";
import { CalendarClock, CalendarDays, ClipboardList, LayoutDashboard, MessagesSquare, Users2 } from "lucide-react";
import { useDateFormat } from "@/src/hooks/useDateFormat";
import { mergeUpcoming } from "@/src/utils/UpcomingEvents";
import { ClubEventResponseControls } from "@/src/components/ClubEventResponseControls";
import type { ClubEventModel } from "@/src/models/ClubEvent";

const UpcomingEventsCard: FC = () => {
    const { t } = useTranslation();
    const { formatDateTime } = useDateFormat();
    const user = useKeycloak();
    // Stable for the component lifetime: recomputing on each render would change the
    // query key every render and trigger an infinite refetch loop.
    const [since] = useState(() => new Date().toISOString());
    const { data: feedData } = $api.useQuery("get", "/v1/events/{userId}", {
        params: {
            path: { userId: user.subject ?? "" },
            query: { since },
        },
    });
    // The club events used to be missing here entirely — the dashboard only knew
    // the mirrored calendar feed.
    const { data: clubData } = $api.useQuery("get", "/v1/club-events", {
        params: { query: { since } },
    });
    const events = mergeUpcoming(
        feedData as EventModel[] | undefined,
        clubData as ClubEventModel[] | undefined,
        5
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="size-5 text-accentDark" />
                    {t("dashboard.events")}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {events.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("dashboard.eventsEmpty")}</p>
                ) : (
                    events.map((event) => (
                        <div key={`${event.origin}-${event.id}`} className="rounded-md border p-2">
                            <div className="flex items-start justify-between gap-2">
                                <p className="font-medium">{event.summary}</p>
                                <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 text-xs">
                                    {event.origin === "club"
                                        ? event.clubName || t("dashboard.originClub")
                                        : t("dashboard.originFeed")}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {formatDateTime(event.startDate)}
                                {event.location ? ` · ${event.location}` : ""}
                            </p>
                        </div>
                    ))
                )}
                <Link to="/myDates" className="inline-block text-sm text-accentDark hover:underline">
                    {t("dashboard.viewAll")}
                </Link>
            </CardContent>
        </Card>
    );
};

/* Undecided club events were invisible: myStatus and the response controls both
   existed, nothing brought them together. */
const OpenResponsesCard: FC = () => {
    const { t } = useTranslation();
    const { formatDateTime } = useDateFormat();
    const [since] = useState(() => new Date().toISOString());
    const { data } = $api.useQuery("get", "/v1/club-events", { params: { query: { since } } });
    const open = ((data as ClubEventModel[] | undefined) ?? [])
        .filter((event) => !event.cancelled && (event.myStatus ?? "") === "")
        .slice(0, 5);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CalendarClock className="size-5 text-accentDark" />
                    {t("dashboard.openResponses")}
                    {open.length > 0 && (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
                            {open.length}
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {open.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("dashboard.openResponsesEmpty")}</p>
                ) : (
                    open.map((event) => (
                        <div key={event.id} className="space-y-2 rounded-md border p-2">
                            <div>
                                <p className="font-medium">{event.summary}</p>
                                <p className="text-xs text-muted-foreground">
                                    {event.clubName ? `${event.clubName} · ` : ""}
                                    {formatDateTime(event.startDate)}
                                </p>
                            </div>
                            <ClubEventResponseControls event={event} />
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
};

const UnreadMessagesCard: FC = () => {
    const { t } = useTranslation();
    const { data } = useUnreadSummary();
    const summary = data?.data;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessagesSquare className="size-5 text-accentDark" />
                    {t("dashboard.messages")}
                    {summary && summary.total > 0 && (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
                            {summary.total > 99 ? "99+" : summary.total}
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {!summary || summary.total === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("dashboard.messagesEmpty")}</p>
                ) : (
                    summary.byClub.map((entry) => (
                        <div key={entry.clubId} className="flex items-center justify-between rounded-md border p-2">
                            <span className="truncate text-sm">{entry.clubName}</span>
                            <span className="text-sm font-semibold">{entry.unread}</span>
                        </div>
                    ))
                )}
                <Link to="/myMessages" className="inline-block text-sm text-accentDark hover:underline">
                    {t("dashboard.viewAll")}
                </Link>
            </CardContent>
        </Card>
    );
};

const MyClubsCard: FC = () => {
    const { t } = useTranslation();
    const user = useKeycloak();
    const { data } = useQuery({
        queryKey: ["clubs"],
        queryFn: async () => axios.get<Club[]>(`${apiURL}/v1/clubs/${user.subject}`),
    });
    const clubs = data?.data ?? [];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users2 className="size-5 text-accentDark" />
                    {t("dashboard.clubs")}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {clubs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("dashboard.clubsEmpty")}</p>
                ) : (
                    clubs.map((club) => (
                        <Link
                            key={club.id}
                            to={`/clubs/${club.id}`}
                            className="block rounded-md border p-2 hover:bg-muted/50"
                        >
                            <p className="font-medium">{club.name}</p>
                            <p className="text-xs text-muted-foreground">{club.club_type}</p>
                        </Link>
                    ))
                )}
            </CardContent>
        </Card>
    );
};

const RecentPinboardCard: FC = () => {
    const { t } = useTranslation();
    const { formatDateTime } = useDateFormat();
    const user = useKeycloak();
    const { data } = useQuery({
        queryKey: ["pinboard-recent", user.subject],
        queryFn: async () => axios.get<PinboardPost[]>(`${apiURL}/v1/users/${user.subject}/pinboard/recent`),
        enabled: !!user.subject,
    });
    const posts = data?.data ?? [];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <LayoutDashboard className="size-5 text-accentDark" />
                    {t("dashboard.pinboard")}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {posts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("dashboard.pinboardEmpty")}</p>
                ) : (
                    posts.map((post) => (
                        <Link
                            key={post.id}
                            to={`/clubs/${post.clubId}?section=pinnwand`}
                            className="block rounded-md border p-2 hover:bg-muted/50"
                        >
                            <p className="font-medium">{post.title}</p>
                            <p className="text-xs text-muted-foreground">
                                {post.clubName} · {post.authorName} · {formatDateTime(post.createdAt)}
                            </p>
                        </Link>
                    ))
                )}
            </CardContent>
        </Card>
    );
};

const InventoryAttentionCard: FC = () => {
    const { t } = useTranslation();
    const { formatDateTime } = useDateFormat();
    const { data } = $api.useQuery("get", "/v1/inventory/attention");
    const missing = (data?.missing ?? []).slice(0, 5);
    const incomplete = (data?.incomplete ?? []).slice(0, 5);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="size-5 text-accentDark" />
                    {t("dashboard.inventory")}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {missing.length === 0 && incomplete.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("dashboard.inventoryEmpty")}</p>
                ) : (
                    <>
                        {missing.map((entry) => (
                            <div key={entry.noteId} className="rounded-md border p-2">
                                <p className="font-medium">{entry.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {t("dashboard.inventoryMissing", { folder: entry.folderName ?? "" })}
                                    {entry.lastSeenAt
                                        ? ` · ${t("dashboard.inventoryLastSeen", {
                                              folder: entry.lastSeenFolderName ?? "",
                                              date: formatDateTime(entry.lastSeenAt),
                                          })}`
                                        : ""}
                                </p>
                            </div>
                        ))}
                        {incomplete.map((entry) => (
                            <div key={entry.noteId} className="rounded-md border p-2">
                                <p className="font-medium">{entry.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {t("dashboard.inventoryIncomplete", { folder: entry.folderName ?? "" })}
                                </p>
                            </div>
                        ))}
                    </>
                )}
                <Link to="/inventory" className="inline-block text-sm text-accentDark hover:underline">
                    {t("dashboard.viewAll")}
                </Link>
            </CardContent>
        </Card>
    );
};

export const DashboardView: FC = () => {
    const { t } = useTranslation();
    return (
        <section className="space-y-4 p-4 md:p-6">
            <header>
                <h2 className="text-2xl font-bold">{t("dashboard.title")}</h2>
            </header>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <UpcomingEventsCard />
                <OpenResponsesCard />
                <UnreadMessagesCard />
                <MyClubsCard />
                <RecentPinboardCard />
                <InventoryAttentionCard />
            </div>
        </section>
    );
};
