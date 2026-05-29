import { useState } from "react"
import { $api } from "@/src/api/client"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ClubEventModel } from "@/src/models/ClubEvent"

type Props = { clubId: string; canManage: boolean }

export const ClubEventsManager = ({ clubId, canManage }: Props) => {
  const queryClient = useQueryClient()
  const [since] = useState(() => new Date().toISOString())
  const [summary, setSummary] = useState("")
  const [startDate, setStartDate] = useState("")

  const { data } = $api.useQuery("get", "/v1/clubs/{clubId}/events", {
    params: { path: { clubId }, query: { since } },
  })
  const events = (data as ClubEventModel[] | undefined) ?? []

  const create = $api.useMutation("post", "/v1/clubs/{clubId}/events", {
    onSuccess: () => {
      setSummary("")
      setStartDate("")
      queryClient.invalidateQueries({ queryKey: ["get", "/v1/clubs/{clubId}/events"] })
    },
  })

  const cancel = $api.useMutation("post", "/v1/clubs/{clubId}/events/{eventId}/cancel", {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["get", "/v1/clubs/{clubId}/events"] })
      queryClient.invalidateQueries({ queryKey: ["get", "/v1/club-events"] })
    },
  })

  return (
    <div className="space-y-4">
      {canManage && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Termin erstellen</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row">
            <Input placeholder="Titel" value={summary} onChange={(e) => setSummary(e.target.value)} />
            <Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Button
              disabled={create.isPending || summary.trim() === "" || startDate === ""}
              onClick={() =>
                create.mutate({
                  params: { path: { clubId } },
                  body: { summary, eventType: "REHEARSAL", startDate: new Date(startDate).toISOString() },
                })
              }
            >
              Erstellen
            </Button>
          </CardContent>
        </Card>
      )}

      {events.map((event) => (
        <Card key={event.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {event.summary} {event.cancelled ? <span className="text-red-600">(abgesagt)</span> : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-muted-foreground text-sm">{new Date(event.startDate).toLocaleString()}</p>
            <p className="text-xs">
              {"✅"} {event.yesCount} {"·"} {"\u{1F914}"} {event.maybeCount} {"·"} {"❌"} {event.noCount} {"·"} {"❔"} {event.undecidedCount}
            </p>
            <AttendanceMatrix clubId={clubId} eventId={event.id} />
            {canManage && !event.cancelled && (
              <Button
                variant="outline"
                size="sm"
                disabled={cancel.isPending}
                onClick={() => cancel.mutate({ params: { path: { clubId, eventId: event.id } } })}
              >
                Absagen
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

type MatrixProps = { clubId: string; eventId: string }

type AttendanceRow = {
  userId?: string
  displayName?: string
  status?: string
  reason?: string
}

const AttendanceMatrix = ({ clubId, eventId }: MatrixProps) => {
  const { data } = $api.useQuery("get", "/v1/clubs/{clubId}/events/{eventId}/attendance", {
    params: { path: { clubId, eventId } },
  })
  const rows: AttendanceRow[] = data?.rows ?? []
  if (rows.length === 0) return null
  return (
    <ul className="text-sm">
      {rows.map((r) => (
        <li key={r.userId} className="flex justify-between">
          <span>{r.displayName}</span>
          <span className="text-muted-foreground">
            {r.status}{r.reason ? ` · ${r.reason}` : ""}
          </span>
        </li>
      ))}
    </ul>
  )
}
