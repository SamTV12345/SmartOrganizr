import { useTranslation } from "react-i18next"
import { useQueryClient } from "@tanstack/react-query"
import { BellRing } from "lucide-react"
import { $api } from "@/src/api/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Hours before an event at which members without an answer get reminded.
const OPTIONS = [12, 24, 48, 72, 168] as const

/** Club setting for automatic reminders about open event responses (off by default). */
export const ClubReminderSettings = ({ clubId, canEdit }: { clubId: string; canEdit: boolean }) => {
    const { t } = useTranslation()
    const queryClient = useQueryClient()
    const { data } = $api.useQuery("get", "/v1/clubs/{clubId}/reminder-settings", { params: { path: { clubId } } })
    const save = $api.useMutation("put", "/v1/clubs/{clubId}/reminder-settings", {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["get", "/v1/clubs/{clubId}/reminder-settings"] }),
    })
    const current = data?.hoursBefore ?? null
    const options = current !== null && !OPTIONS.includes(current as (typeof OPTIONS)[number]) ? [...OPTIONS, current] : OPTIONS

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BellRing className="size-5" />
                    {t("reminders.title")}
                </CardTitle>
                <CardDescription>{t("reminders.hint")}</CardDescription>
            </CardHeader>
            <CardContent>
                <select
                    className="h-9 rounded-md border bg-background px-2 text-sm disabled:opacity-60"
                    value={current === null ? "off" : String(current)}
                    disabled={!canEdit || save.isPending}
                    onChange={(e) =>
                        save.mutate({
                            params: { path: { clubId } },
                            body: { hoursBefore: e.target.value === "off" ? undefined : Number(e.target.value) },
                        })
                    }
                    aria-label={t("reminders.title")}
                    data-testid="reminder-setting"
                >
                    <option value="off">{t("reminders.off")}</option>
                    {options.map((h) => (
                        <option key={h} value={String(h)}>
                            {h % 24 === 0 ? t("reminders.daysBefore", { count: h / 24 }) : t("reminders.hoursBefore", { count: h })}
                        </option>
                    ))}
                </select>
            </CardContent>
        </Card>
    )
}
