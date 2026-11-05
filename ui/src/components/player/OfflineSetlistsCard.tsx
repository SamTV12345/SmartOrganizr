import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { CloudCheck, Play, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    getOfflineSetlists,
    playPathForKey,
    removeSetlistOffline,
    type OfflineSetlist,
} from "@/src/offline/offlineSheetMusic"
import { formatBytes } from "@/src/utils/formatBytes"
import { useDateFormat } from "@/src/hooks/useDateFormat"

/**
 * Setlists saved for offline play. Hidden while there are none; offline this is
 * the way into the play mode, because the event and concert lists need network.
 */
export const OfflineSetlistsCard = () => {
    const { t } = useTranslation()
    const { formatDateTime } = useDateFormat()
    const [setlists, setSetlists] = useState<OfflineSetlist[]>([])

    useEffect(() => {
        getOfflineSetlists().then(setSetlists, () => setSetlists([]))
    }, [])

    if (setlists.length === 0) return null

    const remove = async (key: string) => {
        await removeSetlistOffline(key).catch(() => undefined)
        setSetlists((all) => all.filter((s) => s.key !== key))
    }

    return (
        <Card data-testid="offline-setlists">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CloudCheck className="size-5 text-green-600" />
                    {t("player.offline.cardTitle")}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {setlists.map((s) => {
                    const path = playPathForKey(s.key)
                    return (
                        <div key={s.key} className="flex items-center justify-between gap-2 rounded-md border p-2">
                            <div className="min-w-0">
                                <p className="truncate font-medium">{s.title || t("player.eventProgram")}</p>
                                <p className="text-xs text-muted-foreground">
                                    {t("player.offline.details", { count: s.noteIds.length, size: formatBytes(s.bytes) })}
                                    {" · "}
                                    {t("player.offline.savedAt", { date: formatDateTime(new Date(s.savedAt).toISOString()) })}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                                {path && (
                                    <Link
                                        to={path}
                                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-accentDark hover:bg-muted"
                                    >
                                        <Play className="size-4" />
                                        {t("player.play")}
                                    </Link>
                                )}
                                <button
                                    type="button"
                                    title={t("player.offline.remove")}
                                    aria-label={t("player.offline.remove")}
                                    onClick={() => void remove(s.key)}
                                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-red-600"
                                >
                                    <Trash2 className="size-4" />
                                </button>
                            </div>
                        </div>
                    )
                })}
            </CardContent>
        </Card>
    )
}
