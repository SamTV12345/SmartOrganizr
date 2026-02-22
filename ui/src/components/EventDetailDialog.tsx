import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { EventModel, StatusModel, convertStatusModelToIcon } from "@/src/models/EventModel";
import { Button } from "@/components/ui/button";

type EventDetailDialogProps = {
    event: EventModel | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

const getStatusLabel = (status: StatusModel): string => {
    switch (status) {
        case StatusModel.Ok:
            return "Zugesagt";
        case StatusModel.Deny:
            return "Abgesagt";
        case StatusModel.Maybe:
            return "Vielleicht";
        case StatusModel.NotYetDecided:
            return "Offen";
    }
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
                            <DialogDescription>{event.description || "Keine Beschreibung vorhanden."}</DialogDescription>
                        </DialogHeader>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2 rounded-lg border p-4 text-sm">
                                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
                                    <span className="text-muted-foreground">Status</span>
                                    <span>{getStatusLabel(event.status)}</span>
                                    <span className="text-muted-foreground">Ort</span>
                                    <span>{event.location || "-"}</span>
                                    <span className="text-muted-foreground">Start</span>
                                    <span>{event.startDate ? new Date(event.startDate).toLocaleString() : "-"}</span>
                                    <span className="text-muted-foreground">Ende</span>
                                    <span>{event.endDate ? new Date(event.endDate).toLocaleString() : "-"}</span>
                                    <span className="text-muted-foreground">Geo X/Y</span>
                                    <span>{hasCoordinates ? `${lat}, ${lon}` : "-"}</span>
                                </div>

                                {event.url ? (
                                    <Button asChild variant="outline" className="mt-2 w-full">
                                        <a href={event.url} target="_blank" rel="noreferrer">
                                            Event-Link öffnen
                                        </a>
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
                                        <Button asChild variant="secondary" className="w-full">
                                            <a href={createOsmLink(lat, lon)} target="_blank" rel="noreferrer">
                                                In OpenStreetMap öffnen
                                            </a>
                                        </Button>
                                    </>
                                ) : (
                                    <div className="text-muted-foreground flex h-72 items-center justify-center text-sm">
                                        Keine Koordinaten für Kartenansicht verfügbar.
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
