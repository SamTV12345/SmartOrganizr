import { useQuery } from "@tanstack/react-query"
import { apiURL } from "../Keycloak"
import axios from "axios"
import {useKeycloak} from "@/src/Keycloak/useKeycloak";
import {EventModel, StatusModel} from "@/src/models/EventModel";
import {useTranslation} from "react-i18next";
import {EventCard} from "@/src/components/EventCard";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {useState} from "react";
import {EventDetailDialog} from "@/src/components/EventDetailDialog";

export const EventView = ()=> {
  const user = useKeycloak()
  const {t} = useTranslation()
  const [selectedEvent, setSelectedEvent] = useState<EventModel | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const getEvents = async ()=>{
    return await axios.get<EventModel[]>(apiURL+'/v1/events/' + user.subject, {
      params: {
        since: new Date().toISOString()
      }
    })
  }

  const {data} = useQuery({
    queryKey: ['events'],
    queryFn: getEvents
  })

  const events = (data?.data ?? []).slice().sort((a, b) => {
    const aTime = a.startDate ? new Date(a.startDate).getTime() : Number.MAX_SAFE_INTEGER
    const bTime = b.startDate ? new Date(b.startDate).getTime() : Number.MAX_SAFE_INTEGER
    return aTime - bTime
  })

  const acceptedCount = events.filter((event) => event.status === StatusModel.Ok).length
  const declinedCount = events.filter((event) => event.status === StatusModel.Deny).length
  const openCount = events.filter((event) => event.status === StatusModel.NotYetDecided).length

  return (
    <section className="space-y-4 p-4 md:p-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-bold">{t('my-dates')}</h2>
        <p className="text-muted-foreground text-sm">{t('event-current')}</p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-xs font-medium">Gesamt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{events.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-xs font-medium">Zugesagt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-green-600">{acceptedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-xs font-medium">Offen / Abgesagt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{openCount + declinedCount}</div>
          </CardContent>
        </Card>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center">
            Keine anstehenden Termine gefunden.
          </CardContent>
        </Card>
      ) : (
        <main className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {events.map((event) => (
            <EventCard
              event={event}
              key={event.uid}
              onClick={() => {
                setSelectedEvent(event)
                setDetailOpen(true)
              }}
            />
          ))}
        </main>
      )}

      <EventDetailDialog
        event={selectedEvent}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) {
            setSelectedEvent(null)
          }
        }}
      />
    </section>
  )
}
