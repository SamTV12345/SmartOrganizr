import { useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useQueryClient } from "@tanstack/react-query"
import { $api, uploadWithProgress } from "@/src/api/client"
import { apiURL } from "@/src/Keycloak"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown, ChevronRight, Eye, FileMusic, Library, Plus, Trash2, Upload } from "lucide-react"
import { downloadPdfBlob, pdfKey } from "@/src/player/notePdf"
import { formatBytes } from "@/src/utils/formatBytes"
import { guessSectionId, partNameFromFile } from "@/src/utils/ScoreParts"

type Props = { clubId: string; canEdit: boolean }

const SCORES_KEY = ["get", "/v1/clubs/{clubId}/scores"]
const SCORE_KEY = ["get", "/v1/clubs/{clubId}/scores/{scoreId}"]

/**
 * Club sheet music archive (Notenarchiv): pieces with one PDF per part, each
 * part tied to an instrument section. Members get the part of their section
 * in the play mode; managers maintain the archive here.
 */
export const ClubScoresSection = ({ clubId, canEdit }: Props) => {
    const { t } = useTranslation()
    const queryClient = useQueryClient()
    const [filter, setFilter] = useState("")
    const [openScore, setOpenScore] = useState<string>()
    const [title, setTitle] = useState("")
    const [composer, setComposer] = useState("")
    const [arranger, setArranger] = useState("")

    const { data: scores, isLoading } = $api.useQuery("get", "/v1/clubs/{clubId}/scores", { params: { path: { clubId } } })

    const create = $api.useMutation("post", "/v1/clubs/{clubId}/scores", {
        onSuccess: (created) => {
            void queryClient.invalidateQueries({ queryKey: SCORES_KEY })
            setTitle("")
            setComposer("")
            setArranger("")
            if (created?.id) setOpenScore(created.id)
        },
    })

    const visible = useMemo(() => {
        const q = filter.trim().toLowerCase()
        return (scores ?? []).filter(
            (s) => !q || s.title?.toLowerCase().includes(q) || s.composer?.toLowerCase().includes(q) || s.arranger?.toLowerCase().includes(q),
        )
    }, [scores, filter])

    return (
        <div className="space-y-4" data-testid="scores-section">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Library className="size-5" />
                        {t("scores.title")}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{t("scores.hint")}</p>
                </CardHeader>
                {canEdit && (
                    <CardContent>
                        <form
                            className="flex flex-wrap items-end gap-2"
                            onSubmit={(e) => {
                                e.preventDefault()
                                if (!title.trim()) return
                                create.mutate({
                                    params: { path: { clubId } },
                                    body: { title, composer: composer || undefined, arranger: arranger || undefined },
                                })
                            }}
                        >
                            <Input className="min-w-48 flex-1" placeholder={t("scores.pieceTitle")} value={title} onChange={(e) => setTitle(e.target.value)} data-testid="score-title" />
                            <Input className="w-44" placeholder={t("scores.composer")} value={composer} onChange={(e) => setComposer(e.target.value)} />
                            <Input className="w-44" placeholder={t("scores.arranger")} value={arranger} onChange={(e) => setArranger(e.target.value)} />
                            <Button type="submit" disabled={!title.trim() || create.isPending} data-testid="score-create">
                                <Plus className="size-4" />
                                {t("scores.add")}
                            </Button>
                        </form>
                    </CardContent>
                )}
            </Card>

            {(scores?.length ?? 0) > 5 && (
                <Input placeholder={t("scores.filter")} value={filter} onChange={(e) => setFilter(e.target.value)} />
            )}

            {isLoading ? null : visible.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("scores.empty")}</p>
            ) : (
                <ul className="space-y-2">
                    {visible.map((score) => (
                        <li key={score.id} className="rounded-lg border" data-testid="score-item">
                            <button
                                type="button"
                                className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50"
                                onClick={() => setOpenScore((o) => (o === score.id ? undefined : score.id))}
                            >
                                {openScore === score.id ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate font-medium">{score.title}</span>
                                    {(score.composer || score.arranger) && (
                                        <span className="block truncate text-xs text-muted-foreground">
                                            {[score.composer, score.arranger && t("scores.arrangedBy", { name: score.arranger })].filter(Boolean).join(" · ")}
                                        </span>
                                    )}
                                </span>
                                <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                    {t("scores.partCount", { count: score.partCount ?? 0 })}
                                </span>
                            </button>
                            {openScore === score.id && score.id && <ScoreDetail clubId={clubId} scoreId={score.id} canEdit={canEdit} />}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

type Upload = { file: File; name: string; sectionId: string; progress: number; error?: boolean }

const ScoreDetail = ({ clubId, scoreId, canEdit }: { clubId: string; scoreId: string; canEdit: boolean }) => {
    const { t } = useTranslation()
    const queryClient = useQueryClient()
    const fileInput = useRef<HTMLInputElement>(null)
    const [uploads, setUploads] = useState<Upload[]>([])
    const [uploading, setUploading] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)

    const { data: score } = $api.useQuery("get", "/v1/clubs/{clubId}/scores/{scoreId}", { params: { path: { clubId, scoreId } } })
    const { data: sections } = $api.useQuery("get", "/v1/clubs/{clubId}/sections", { params: { path: { clubId } } })

    const refresh = () => {
        void queryClient.invalidateQueries({ queryKey: SCORE_KEY })
        void queryClient.invalidateQueries({ queryKey: SCORES_KEY })
    }
    const updatePart = $api.useMutation("patch", "/v1/clubs/{clubId}/scores/{scoreId}/parts/{partId}", { onSuccess: refresh })
    const deletePart = $api.useMutation("delete", "/v1/clubs/{clubId}/scores/{scoreId}/parts/{partId}", { onSuccess: refresh })
    const deleteScore = $api.useMutation("delete", "/v1/clubs/{clubId}/scores/{scoreId}", {
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: SCORES_KEY }),
    })

    const pickFiles = (files: FileList | null) => {
        if (!files) return
        setUploads(
            Array.from(files).map((file) => {
                const name = partNameFromFile(file.name)
                return { file, name, sectionId: guessSectionId(name, sections ?? []) ?? "", progress: 0 }
            }),
        )
    }

    const startUpload = async () => {
        setUploading(true)
        for (let i = 0; i < uploads.length; i++) {
            const u = uploads[i]
            const form = new FormData()
            form.append("file", u.file)
            form.append("name", u.name)
            if (u.sectionId) form.append("sectionId", u.sectionId)
            try {
                await uploadWithProgress(`${apiURL}/v1/clubs/${clubId}/scores/${scoreId}/parts`, form, (p) =>
                    setUploads((all) => all.map((x, j) => (j === i ? { ...x, progress: p } : x))),
                )
                setUploads((all) => all.map((x, j) => (j === i ? { ...x, progress: 100 } : x)))
            } catch {
                setUploads((all) => all.map((x, j) => (j === i ? { ...x, error: true } : x)))
            }
        }
        setUploading(false)
        refresh()
        setUploads((all) => all.filter((u) => u.error))
    }

    const openPart = async (partId: string) => {
        // Opened synchronously so popup blockers allow it; filled once the PDF is there.
        const win = window.open("", "_blank")
        try {
            const blob = await downloadPdfBlob(pdfKey({ kind: "part", clubId, scoreId, partId }))
            const url = URL.createObjectURL(blob)
            if (win) win.location.href = url
            else window.location.href = url
        } catch {
            win?.close()
        }
    }

    const sectionSelect = (value: string, onChange: (v: string) => void, testId?: string) => (
        <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            data-testid={testId}
        >
            <option value="">{t("scores.noSection")}</option>
            {(sections ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                    {s.name}
                </option>
            ))}
        </select>
    )

    return (
        <div className="space-y-3 border-t p-3">
            {(score?.parts?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">{t("scores.noParts")}</p>
            ) : (
                <ul className="space-y-1">
                    {score?.parts?.map((part) => (
                        <li key={part.id} className="flex flex-wrap items-center gap-2 rounded-md p-1 hover:bg-muted/40" data-testid="score-part">
                            <FileMusic className="size-4 shrink-0 text-muted-foreground" />
                            {canEdit ? (
                                <Input
                                    className="h-9 min-w-40 flex-1"
                                    defaultValue={part.name}
                                    onBlur={(e) => {
                                        const name = e.target.value.trim()
                                        if (name && name !== part.name && part.id) {
                                            updatePart.mutate({
                                                params: { path: { clubId, scoreId, partId: part.id } },
                                                body: { name, sectionId: part.sectionId ?? undefined },
                                            })
                                        }
                                    }}
                                />
                            ) : (
                                <span className="min-w-40 flex-1">{part.name}</span>
                            )}
                            {canEdit ? (
                                sectionSelect(part.sectionId ?? "", (sectionId) =>
                                    part.id &&
                                    updatePart.mutate({
                                        params: { path: { clubId, scoreId, partId: part.id } },
                                        body: { name: part.name ?? "", sectionId: sectionId || undefined },
                                    }),
                                )
                            ) : (
                                <span className="text-sm text-muted-foreground">{part.sectionName ?? t("scores.noSection")}</span>
                            )}
                            <span className="w-16 text-right text-xs text-muted-foreground">{formatBytes(part.sizeBytes ?? 0)}</span>
                            <Button variant="ghost" size="sm" title={t("scores.open")} aria-label={t("scores.open")} onClick={() => part.id && void openPart(part.id)}>
                                <Eye className="size-4" />
                            </Button>
                            {canEdit && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    title={t("scores.deletePart")}
                                    aria-label={t("scores.deletePart")}
                                    onClick={() => part.id && deletePart.mutate({ params: { path: { clubId, scoreId, partId: part.id } } })}
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {canEdit && (
                <div className="space-y-2 rounded-md border border-dashed p-3">
                    <input
                        ref={fileInput}
                        type="file"
                        accept="application/pdf,.pdf"
                        multiple
                        className="hidden"
                        onChange={(e) => pickFiles(e.target.files)}
                        data-testid="part-files"
                    />
                    {uploads.length === 0 ? (
                        <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
                            <Upload className="size-4" />
                            {t("scores.uploadParts")}
                        </Button>
                    ) : (
                        <>
                            <p className="text-xs text-muted-foreground">{t("scores.uploadHint")}</p>
                            {uploads.map((u, i) => (
                                <div key={`${u.file.name}-${i}`} className="flex flex-wrap items-center gap-2" data-testid="pending-part">
                                    <Input
                                        className="h-9 min-w-40 flex-1"
                                        value={u.name}
                                        disabled={uploading}
                                        onChange={(e) => setUploads((all) => all.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                                    />
                                    {sectionSelect(u.sectionId, (sectionId) =>
                                        setUploads((all) => all.map((x, j) => (j === i ? { ...x, sectionId } : x))),
                                        "pending-part-section",
                                    )}
                                    <span className={`w-20 text-right text-xs ${u.error ? "text-red-600" : "text-muted-foreground"}`}>
                                        {u.error ? t("scores.uploadFailed") : uploading || u.progress > 0 ? `${u.progress} %` : formatBytes(u.file.size)}
                                    </span>
                                </div>
                            ))}
                            <div className="flex gap-2">
                                <Button size="sm" onClick={() => void startUpload()} disabled={uploading || uploads.some((u) => !u.name.trim())} data-testid="parts-upload">
                                    <Upload className="size-4" />
                                    {t("scores.uploadCount", { count: uploads.length })}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setUploads([])} disabled={uploading}>
                                    {t("scores.cancel")}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {canEdit && (
                <div className="flex justify-end">
                    {confirmDelete ? (
                        <div className="flex items-center gap-2 text-sm">
                            <span>{t("scores.deleteConfirm")}</span>
                            <Button size="sm" variant="destructive" onClick={() => deleteScore.mutate({ params: { path: { clubId, scoreId } } })}>
                                {t("scores.deleteScore")}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                                {t("scores.cancel")}
                            </Button>
                        </div>
                    ) : (
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setConfirmDelete(true)}>
                            <Trash2 className="size-4" />
                            {t("scores.deleteScore")}
                        </Button>
                    )}
                </div>
            )}
        </div>
    )
}
