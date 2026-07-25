import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { EventModel, StatusModel, convertStatusModelToIcon } from "@/src/models/EventModel";
import { Button } from "@/components/ui/button";
import { useDateFormat } from "@/src/hooks/useDateFormat";
import { useTranslation } from "react-i18next";

type EventDetailDialogProps = {
    event: EventModel | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

const STATUS_KEYS: Record<StatusModel, string> = {
    [StatusModel.Ok]: "events.statusOk",
    [StatusModel.Deny]: "events.statusDeny",
    [StatusModel.Maybe]: "events.statusMaybe",
    [StatusModel.NotYetDecided]: "events.statusOpen",
};

const createOsmEmbedUrl = (lat: number, lon: number): string => {
    const delta = 0.01;
    const left = lon - delta;
    const right = lon + delta;
    const top = lat + delta;
    const bottom = lat - delta;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lon}`;
};

const createOsmLink = (lat: number, lon: number): string =>
    `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`;

export const EventDetailDialog = ({ event, open, onOpenChange }: EventDetailDialogProps) => {
    const { t } = useTranslation();
    const { formatDateTime } = useDateFormat();
    const lat = event?.geoDateX;
    const lon = event?.geoDateY;
    const hasCoordinates = typeof lat === "number" && typeof lon === "number";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                {!event ? null : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="grid grid-cols-[1fr_auto] items-start gap-3">
                                <span className="break-words">{event.summary}</span>
                                {convertStatusModelToIcon(event.status)}
                            </DialogTitle>
                            <DialogDescription>{event.description || t("events.noDescription")}</DialogDescription>
                        </DialogHeader>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2 rounded-lg border p-4 text-sm">
                                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
                                    <span className="text-muted-foreground">{t("events.status")}</span>
                                    <span>{t(STATUS_KEYS[event.status])}</span>
                                    <span className="text-muted-foreground">{t("events.location")}</span>
                                    <span>{event.location || "-"}</span>
                                    <span className="text-muted-foreground">{t("events.start")}</span>
                                    <span>{event.startDate ? formatDateTime(event.startDate) : "-"}</span>
                                    <span className="text-muted-foreground">{t("events.end")}</span>
                                    <span>{event.endDate ? formatDateTime(event.endDate) : "-"}</span>
                                    <span className="text-muted-foreground">{t("events.geo")}</span>
                                    <span>{hasCoordinates ? `${lat}, ${lon}` : "-"}</span>
                                </div>

                                {event.url ? (
                                    <Button
                                        render={<a href={event.url} target="_blank" rel="noreferrer" />}
                                        variant="outline"
                                        className="mt-2 w-full"
                                    >
                                        {t("events.openLink")}
                                    </Button>
                                ) : null}
                            </div>

                            <div className="space-y-2 rounded-lg border p-2">
                                {hasCoordinates ? (
                                    <>
                                        <iframe
                                            title="OpenStreetMap"
                                            src={createOsmEmbedUrl(lat, lon)}
                                            className="h-72 w-full rounded-md border"
                                            loading="lazy"
                                        />
                                        <Button
                                            render={<a href={createOsmLink(lat, lon)} target="_blank" rel="noreferrer" />}
                                            variant="secondary"
                                            className="w-full"
                                        >
                                            {t("events.openInOsm")}
                                        </Button>
                                    </>
                                ) : (
                                    <div className="text-muted-foreground flex h-72 items-center justify-center text-sm">
                                        {t("events.noCoordinates")}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};
