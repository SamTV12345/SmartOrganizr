import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { TriangleAlert } from "lucide-react"
import { $api } from "@/src/api/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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

type Props = {
    clubId: string
    clubName: string
    isLeiter: boolean
    isLastLeiter: boolean
}

export const ClubDangerZone = ({ clubId, clubName, isLeiter, isLastLeiter }: Props) => {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [deleteConfirmName, setDeleteConfirmName] = useState("")

    const onGone = async () => {
        await queryClient.invalidateQueries({ queryKey: ["clubs"] })
        navigate("/dashboard")
    }

    const leaveMutation = $api.useMutation("delete", "/v1/clubs/{clubId}/members/me", {
        onSuccess: onGone,
    })
    const deleteMutation = $api.useMutation("delete", "/v1/clubs/{clubId}", {
        onSuccess: onGone,
    })

    return (
        <Card className="border-red-300 dark:border-red-900">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                    <TriangleAlert className="size-5" />
                    {t("club-danger-zone")}
                </CardTitle>
                <CardDescription>{t("club-danger-zone-description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <AlertDialog>
                        <AlertDialogTrigger
                            render={<Button variant="outline" disabled={isLastLeiter || leaveMutation.isPending} />}
                        >
                            {t("club-leave")}
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t("club-leave")}</AlertDialogTitle>
                                <AlertDialogDescription>{t("club-leave-confirm")}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => leaveMutation.mutate({ params: { path: { clubId } } })}
                                >
                                    {t("club-leave")}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    {isLastLeiter && (
                        <p className="text-sm text-muted-foreground">{t("club-leave-last-leiter-hint")}</p>
                    )}
                </div>

                {isLeiter && (
                    <AlertDialog onOpenChange={() => setDeleteConfirmName("")}>
                        <AlertDialogTrigger
                            render={<Button variant="destructive" disabled={deleteMutation.isPending} />}
                        >
                            {t("club-delete")}
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t("club-delete")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {t("club-delete-confirm-description", { name: clubName })}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <Input
                                value={deleteConfirmName}
                                onChange={(event) => setDeleteConfirmName(event.target.value)}
                                placeholder={clubName}
                                aria-label={t("club-delete-confirm-label")}
                            />
                            <AlertDialogFooter>
                                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                                <AlertDialogAction
                                    disabled={deleteConfirmName.trim() !== clubName}
                                    onClick={() => deleteMutation.mutate({ params: { path: { clubId } } })}
                                >
                                    {t("club-delete")}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </CardContent>
        </Card>
    )
}
