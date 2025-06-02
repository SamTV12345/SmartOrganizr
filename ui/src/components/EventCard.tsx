import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {convertStatusModelToIcon, EventModel, StatusModel} from "@/src/models/EventModel";

type EventCardProps = {
    event: EventModel
}

export const EventCard = ({event}: EventCardProps)=>{
    console.log(event.status === StatusModel.Deny)
    const icon = convertStatusModelToIcon(event.status)

    return  <Card className="w-fit" key={event.uid}>
        <CardHeader className="w-96">
            <CardTitle className="grid grid-cols-[auto_auto]"><span className="break-all">{event.summary}</span> {icon}</CardTitle>
            <CardDescription>{event?.description}</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-2">
                <label>Ort</label>
                <span>{event.location}</span>
                <label>Zeit</label>
                <span>{event.startDate? `${new Date(event.startDate).toLocaleString()}`: ''}</span>
            </div>
        </CardContent>
    </Card>
}