import { useState } from "react"
import { useTranslation } from "react-i18next"
import { $api } from "@/src/api/client"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ClubEventModel, ClubEventResponseStatus } from "@/src/models/ClubEvent"

type Props = { event: ClubEventModel }

const STATUSES: { value: Exclude<ClubEventResponseStatus, "">; label: string }[] = [
  { value: "YES", label: "Zusagen" },
  { value: "MAYBE", label: "Vielleicht" },
  { value: "NO", label: "Absagen" },
]

export const ClubEventResponseControls = ({ event }: Props) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [reason, setReason] = useState(event.myReason ?? "")

  const mutation = $api.useMutation("put", "/v1/clubs/{clubId}/events/{eventId}/response", {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["get", "/v1/club-events"] })
      queryClient.invalidateQueries({ queryKey: ["get", "/v1/clubs/{clubId}/events"] })
    },
  })

  const submit = (status: Exclude<ClubEventResponseStatus, "">) => {
    mutation.mutate({
      params: { path: { clubId: event.clubId, eventId: event.id } },
      body: { status, reason: reason.trim() === "" ? undefined : reason },
    })
  }

  // The server rejects responses to cancelled events; don't offer the buttons.
  if (event.cancelled) {
    return <p className="text-sm text-red-600">{t("clubEvents.cancelled")}</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {STATUSES.map((s) => (
          <Button
            key={s.value}
            variant={event.myStatus === s.value ? "default" : "outline"}
            size="sm"
            disabled={mutation.isPending}
            onClick={() => submit(s.value)}
          >
            {s.label}
          </Button>
        ))}
      </div>
      <Input
        placeholder="Grund (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        onBlur={() => {
          if (event.myStatus) submit(event.myStatus as Exclude<ClubEventResponseStatus, "">)
        }}
      />
    </div>
  )
}
