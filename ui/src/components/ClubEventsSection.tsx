import { useState } from "react"
import { useTranslation } from "react-i18next"
import { $api } from "@/src/api/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClubEventResponseControls } from "@/src/components/ClubEventResponseControls"
import type { ClubEventModel } from "@/src/models/ClubEvent"

export const ClubEventsSection = () => {
  const { t } = useTranslation()
  // Stable for the component lifetime: recomputing on each render would change the
  // query key every render and trigger an infinite refetch loop.
  const [since] = useState(() => new Date().toISOString())
  const { data } = $api.useQuery("get", "/v1/club-events", {
    params: { query: { since } },
  })
  const events = (data as ClubEventModel[] | undefined) ?? []

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-center">
          Keine anstehenden Vereinstermine.
        </CardContent>
      </Card>
    )
  }

  return (
    <main className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {events.map((event) => (
        <Card key={event.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {event.summary}
              {event.clubName ? <span className="text-muted-foreground text-xs"> · {event.clubName}</span> : null}
              {event.cancelled ? <span className="text-xs text-red-600"> {t("clubEvents.cancelled")}</span> : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground text-sm">
              {new Date(event.startDate).toLocaleString()}
              {event.location ? ` · ${event.location}` : ""}
            </p>
            <p className="text-xs">
              ✅ {event.yesCount} · 🤔 {event.maybeCount} · ❌ {event.noCount} · ❔ {event.undecidedCount}
            </p>
            <ClubEventResponseControls event={event} />
          </CardContent>
        </Card>
      ))}
    </main>
  )
}
