import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {convertStatusModelToIcon, EventModel} from "@/src/models/EventModel";
import {useDateFormat} from "@/src/hooks/useDateFormat";
import {useTranslation} from "react-i18next";

type EventCardProps = {
    event: EventModel
    onClick?: () => void
}

export const EventCard = ({event, onClick}: EventCardProps)=>{
    const icon = convertStatusModelToIcon(event.status)
    const {t} = useTranslation()
    const {formatDateTime} = useDateFormat()

    return  <Card
        className="h-full cursor-pointer transition hover:border-primary/40 hover:shadow-md"
        key={event.uid}
        onClick={onClick}
    >
        <CardHeader>
            <CardTitle className="grid grid-cols-[1fr_auto] items-start gap-2">
                <span className="break-words">{event.summary}</span>
                {icon}
            </CardTitle>
            <CardDescription>{event?.description}</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <label className="text-muted-foreground">{t("events.location")}</label>
                <span>{event.location ?? "-"}</span>
                <label className="text-muted-foreground">{t("events.time")}</label>
                <span>{event.startDate ? formatDateTime(event.startDate) : "-"}</span>
            </div>
        </CardContent>
    </Card>
}
