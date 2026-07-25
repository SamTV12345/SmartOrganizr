/** One upcoming appointment, regardless of where it came from. */
export type UpcomingItem = {
    id: string;
    summary: string;
    startDate?: string;
    location?: string;
    /** "feed" = mirrored from a subscribed calendar, "club" = native club event. */
    origin: "feed" | "club";
    clubName?: string;
};

type FeedEvent = { uid?: string; summary?: string; startDate?: string; location?: string };
type ClubEvent = {
    id?: string;
    summary?: string;
    startDate?: string;
    location?: string;
    clubName?: string;
    cancelled?: boolean;
};

const NO_DATE = Number.MAX_SAFE_INTEGER;

const startsAt = (item: UpcomingItem) =>
    item.startDate ? new Date(item.startDate).getTime() : NO_DATE;

/**
 * Merges the mirrored calendar feed and the native club events into one list,
 * soonest first. The dashboard showed only the feed, which made the club events
 * — the feature with the most machinery behind it — invisible there.
 */
export const mergeUpcoming = (
    feed: FeedEvent[] | undefined,
    club: ClubEvent[] | undefined,
    limit: number
): UpcomingItem[] => {
    const items: UpcomingItem[] = [];
    for (const event of feed ?? []) {
        items.push({
            id: event.uid ?? "",
            summary: event.summary ?? "",
            startDate: event.startDate,
            location: event.location,
            origin: "feed",
        });
    }
    for (const event of club ?? []) {
        if (event.cancelled) continue;
        items.push({
            id: event.id ?? "",
            summary: event.summary ?? "",
            startDate: event.startDate,
            location: event.location,
            origin: "club",
            clubName: event.clubName,
        });
    }
    return items.sort((a, b) => startsAt(a) - startsAt(b)).slice(0, limit);
};
