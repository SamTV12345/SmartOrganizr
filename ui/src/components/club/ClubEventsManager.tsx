import { useState } from "react"
import { $api } from "@/src/api/client"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Pencil, Trash2 } from "lucide-react"
import type { ClubEventModel } from "@/src/models/ClubEvent"

type Props = { clubId: string; canManage: boolean }

const EVENT_TYPES = ["REHEARSAL", "CONCERT", "OTHER"] as const
type EventType = (typeof EVENT_TYPES)[number]

const toLocalInput = (iso: string) => {
  try {
    return format(new Date(iso), "yyyy-MM-dd'T'HH:mm")
  } catch {
    return ""
  }
}

type FormState = {
  summary: string
  eventType: EventType
  startDate: string
  endDate: string
  location: string
  description: string
}

const emptyForm: FormState = {
  summary: "",
  eventType: "REHEARSAL",
  startDate: "",
  endDate: "",
  location: "",
  description: "",
}

export const ClubEventsManager = ({ clubId, canManage }: Props) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [since] = useState(() => new Date().toISOString())
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data } = $api.useQuery("get", "/v1/clubs/{clubId}/events", {
    params: { path: { clubId }, query: { since } },
  })
  const events = (data as ClubEventModel[] | undefined) ?? []

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["get", "/v1/clubs/{clubId}/events"] })
    queryClient.invalidateQueries({ queryKey: ["get", "/v1/club-events"] })
  }

  const create = $api.useMutation("post", "/v1/clubs/{clubId}/events", {
    onSuccess: () => {
      resetForm()
      invalidate()
    },
  })

  const update = $api.useMutation("put", "/v1/clubs/{clubId}/events/{eventId}", {
    onSuccess: () => {
      resetForm()
      invalidate()
    },
  })

  const cancel = $api.useMutation("post", "/v1/clubs/{clubId}/events/{eventId}/cancel", {
    onSuccess: invalidate,
  })

  const remove = $api.useMutation("delete", "/v1/clubs/{clubId}/events/{eventId}", {
    onSuccess: invalidate,
  })

  const startEdit = (event: ClubEventModel) => {
    setEditingId(event.id)
    setForm({
      summary: event.summary,
      eventType: event.eventType,
      startDate: toLocalInput(event.startDate),
      endDate: event.endDate ? toLocalInput(event.endDate) : "",
      location: event.location ?? "",
      description: event.description ?? "",
    })
  }

  const isSaving = create.isPending || update.isPending
  const canSubmit = form.summary.trim() !== "" && form.startDate !== "" && !isSaving

  const onSubmit = () => {
    const body = {
      summary: form.summary,
      eventType: form.eventType,
      startDate: new Date(form.startDate).toISOString(),
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      location: form.location.trim() || undefined,
      description: form.description.trim() || undefined,
    }
    if (editingId) {
      update.mutate({ params: { path: { clubId, eventId: editingId } }, body })
    } else {
      create.mutate({ params: { path: { clubId } }, body })
    }
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {editingId ? t("clubEvents.edit") : t("clubEvents.create")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="event-summary">{t("clubEvents.field.summary")}</Label>
                <Input
                  id="event-summary"
                  value={form.summary}
                  onChange={(e) => set("summary", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="event-type">{t("clubEvents.field.type")}</Label>
                <Select
                  value={form.eventType}
                  onValueChange={(value) => set("eventType", value as EventType)}
                >
                  <SelectTrigger id="event-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`clubEvents.type.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="event-start">{t("clubEvents.field.start")}</Label>
                <Input
                  id="event-start"
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => set("startDate", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="event-end">{t("clubEvents.field.end")}</Label>
                <Input
                  id="event-end"
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => set("endDate", e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event-location">{t("clubEvents.field.location")}</Label>
              <Input
                id="event-location"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event-description">{t("clubEvents.field.description")}</Label>
              <Textarea
                id="event-description"
                rows={3}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={onSubmit} disabled={!canSubmit}>
                {t("save")}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={resetForm}>
                  {t("cancel")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {events.map((event) => (
        <Card key={event.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">
                {event.summary}{" "}
                <span className="text-muted-foreground text-xs">
                  {t(`clubEvents.type.${event.eventType}`)}
                </span>{" "}
                {event.cancelled ? (
                  <span className="text-red-600">{t("clubEvents.cancelled")}</span>
                ) : null}
              </CardTitle>
              {canManage && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => startEdit(event)}>
                    <Pencil className="size-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>
                      <Trash2 className="size-4 text-red-500" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("clubEvents.delete")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("clubEvents.delete-confirm")}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            remove.mutate({ params: { path: { clubId, eventId: event.id } } })
                          }
                        >
                          {t("clubEvents.delete")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-muted-foreground text-sm">
              {new Date(event.startDate).toLocaleString()}
              {event.endDate ? ` – ${new Date(event.endDate).toLocaleString()}` : ""}
              {event.location ? ` · ${event.location}` : ""}
            </p>
            {event.description ? (
              <p className="whitespace-pre-wrap text-sm">{event.description}</p>
            ) : null}
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
                {t("clubEvents.cancel-event")}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

type MatrixProps = { clubId: string; eventId: string }

const AttendanceMatrix = ({ clubId, eventId }: MatrixProps) => {
  const { t } = useTranslation()
  const { data } = $api.useQuery("get", "/v1/clubs/{clubId}/events/{eventId}/attendance", {
    params: { path: { clubId, eventId } },
  })
  // Server filters visibility: rows may contain only the caller's own row (or
  // nothing), and reason is "" when reason_visibility hides it. Render only
  // what is present.
  const rows = data?.rows ?? []
  if (rows.length === 0) return null
  return (
    <ul className="text-sm">
      {rows.map((r) => (
        <li key={r.userId} className="flex justify-between gap-2">
          <span>{r.displayName}</span>
          <span className="text-muted-foreground text-right">
            {r.status ? t(`clubEvents.status.${r.status}`) : ""}
            {r.reason ? ` · ${r.reason}` : ""}
          </span>
        </li>
      ))}
    </ul>
  )
}
