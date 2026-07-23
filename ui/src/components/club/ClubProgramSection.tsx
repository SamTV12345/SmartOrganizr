import { useEffect, useState } from "react"
import { $api } from "@/src/api/client"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronDown, ChevronUp, ListMusic, Plus, Trash2 } from "lucide-react"
import type { ClubEventModel } from "@/src/models/ClubEvent"

// ponytail: labels are inline German. This section has few strings and the e2e
// harness has no i18n runtime, so plain text keeps the test deterministic.

type Props = { clubId: string; canManage: boolean }

type Entry = {
  id?: string
  noteId?: string | null
  title: string
  durationMinutes?: number | null
  noteText?: string | null
}

export const ClubProgramSection = ({ clubId, canManage }: Props) => {
  const [openId, setOpenId] = useState<string | null>(null)

  const { data } = $api.useQuery("get", "/v1/clubs/{clubId}/events", {
    params: { path: { clubId }, query: { since: "1970-01-01T00:00:00Z" } },
  })
  const events = (data as ClubEventModel[] | undefined) ?? []

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListMusic className="size-5 text-accentDark" />
            Programm
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Wähle einen Termin, um sein Programm (Setlist) zu verwalten.
          </p>
        </CardContent>
      </Card>

      {events.length === 0 && (
        <p className="text-muted-foreground text-sm" data-testid="program-no-events">
          Keine Termine vorhanden.
        </p>
      )}

      {events.map((event) => (
        <Card key={event.id} data-testid="program-event">
          <CardHeader className="pb-2">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 text-left"
              onClick={() => setOpenId((id) => (id === event.id ? null : event.id))}
              data-testid={`program-event-toggle-${event.id}`}
            >
              <CardTitle className="text-base">
                {event.summary}{" "}
                <span className="text-muted-foreground text-xs">
                  {new Date(event.startDate).toLocaleDateString()}
                </span>
              </CardTitle>
              {openId === event.id ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </button>
          </CardHeader>
          {openId === event.id && (
            <CardContent>
              <ProgramEditor clubId={clubId} eventId={event.id} canManage={canManage} />
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}

type EditorProps = { clubId: string; eventId: string; canManage: boolean }

type NoteOption = { id: string; name: string }

const ProgramEditor = ({ clubId, eventId, canManage }: EditorProps) => {
  const queryClient = useQueryClient()
  const [entries, setEntries] = useState<Entry[]>([])
  const [selectedNote, setSelectedNote] = useState<string>("")

  const { data: program } = $api.useQuery("get", "/v1/clubs/{clubId}/events/{eventId}/program", {
    params: { path: { clubId, eventId } },
  })

  useEffect(() => {
    if (program) {
      setEntries(
        program.map((p) => ({
          id: p.id,
          noteId: p.noteId ?? null,
          title: p.title,
          durationMinutes: p.durationMinutes ?? null,
          noteText: p.noteText ?? null,
        })),
      )
    }
  }, [program])

  // Reuse the existing per-user note list endpoint for the picker.
  const { data: notesData } = $api.useQuery("get", "/v1/elements/notes", {})
  const notes: NoteOption[] =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((notesData as any)?._embedded?.noteRepresentationModelList ?? []).map((n: any) => ({
      id: n.id,
      name: n.name,
    }))

  const save = $api.useMutation("put", "/v1/clubs/{clubId}/events/{eventId}/program", {
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["get", "/v1/clubs/{clubId}/events/{eventId}/program"],
      }),
  })

  const addNote = () => {
    const note = notes.find((n) => n.id === selectedNote)
    if (!note) return
    setEntries((e) => [...e, { noteId: note.id, title: note.name }])
    setSelectedNote("")
  }

  const addFreeText = () =>
    setEntries((e) => [...e, { noteId: null, title: "" }])

  const update = (i: number, patch: Partial<Entry>) =>
    setEntries((e) => e.map((entry, idx) => (idx === i ? { ...entry, ...patch } : entry)))

  const remove = (i: number) => setEntries((e) => e.filter((_, idx) => idx !== i))

  const move = (i: number, dir: -1 | 1) =>
    setEntries((e) => {
      const j = i + dir
      if (j < 0 || j >= e.length) return e
      const next = [...e]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  const onSave = () =>
    save.mutate({
      params: { path: { clubId, eventId } },
      body: {
        entries: entries.map((e) => ({
          noteId: e.noteId ?? undefined,
          title: e.title,
          durationMinutes: e.durationMinutes ?? undefined,
          noteText: e.noteText ?? undefined,
        })),
      },
    })

  return (
    <div className="space-y-3" data-testid="program-editor">
      {entries.length === 0 && (
        <p className="text-muted-foreground text-sm" data-testid="program-empty">
          Noch keine Stücke im Programm.
        </p>
      )}
      <ol className="space-y-2">
        {entries.map((entry, i) => (
          <li
            key={entry.id ?? `new-${i}`}
            className="flex flex-wrap items-center gap-2 rounded-lg border p-2"
            data-testid="program-entry"
          >
            <span className="text-muted-foreground w-6 text-sm">{i + 1}.</span>
            <Input
              className="min-w-40 flex-1"
              value={entry.title}
              placeholder="Titel"
              disabled={!canManage}
              onChange={(ev) => update(i, { title: ev.target.value })}
              data-testid="program-entry-title"
            />
            <Input
              className="w-20"
              type="number"
              min={0}
              value={entry.durationMinutes ?? ""}
              placeholder="min"
              disabled={!canManage}
              onChange={(ev) =>
                update(i, {
                  durationMinutes: ev.target.value === "" ? null : Number(ev.target.value),
                })
              }
              data-testid="program-entry-duration"
            />
            {canManage && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Nach oben"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  data-testid="program-entry-up"
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Nach unten"
                  disabled={i === entries.length - 1}
                  onClick={() => move(i, 1)}
                  data-testid="program-entry-down"
                >
                  <ChevronDown className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Entfernen"
                  onClick={() => remove(i)}
                  data-testid="program-entry-remove"
                >
                  <Trash2 className="size-4 text-red-500" />
                </Button>
              </div>
            )}
          </li>
        ))}
      </ol>

      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedNote} onValueChange={(v) => setSelectedNote(v ?? "")}>
            <SelectTrigger className="w-56" data-testid="program-note-select">
              <SelectValue placeholder="Note aus Bibliothek..." />
            </SelectTrigger>
            <SelectContent>
              {notes.map((n) => (
                <SelectItem key={n.id} value={n.id}>
                  {n.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            disabled={!selectedNote}
            onClick={addNote}
            data-testid="program-add-note"
          >
            <Plus className="size-4" />
            Note hinzufügen
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={addFreeText}
            data-testid="program-add-free"
          >
            <Plus className="size-4" />
            Freier Titel
          </Button>
          <Button onClick={onSave} disabled={save.isPending} data-testid="program-save">
            Speichern
          </Button>
        </div>
      )}
    </div>
  )
}
