import { FC, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { http as axios } from "@/src/api/client";
import { apiURL } from "@/src/Keycloak";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/alert-dialog";
import { CalendarOff, Trash2, Users2 } from "lucide-react";

type Absence = {
    id: string;
    userId: string;
    displayName?: string;
    startDate: string;
    endDate: string;
    reason: string;
    createdAt: string;
};

type Props = {
    clubId: string;
    // canManage marks leaders/co-leaders, who additionally see the club-wide overview.
    canManage: boolean;
};

export const ClubAbsenceSection: FC<Props> = ({ clubId, canManage }) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [reason, setReason] = useState("");

    const { data: mineData } = useQuery({
        queryKey: ["club-absences", clubId],
        queryFn: async () => axios.get<Absence[]>(`${apiURL}/v1/clubs/${clubId}/absences`),
    });
    const mine = mineData?.data ?? [];

    const { data: overviewData } = useQuery({
        queryKey: ["club-absences-overview", clubId],
        queryFn: async () => axios.get<Absence[]>(`${apiURL}/v1/clubs/${clubId}/absences/overview`),
        enabled: canManage,
    });
    const overview = overviewData?.data ?? [];

    const invalidate = async () => {
        await queryClient.invalidateQueries({ queryKey: ["club-absences", clubId] });
        await queryClient.invalidateQueries({ queryKey: ["club-absences-overview", clubId] });
    };

    const createMutation = useMutation({
        mutationFn: async () =>
            axios.post(`${apiURL}/v1/clubs/${clubId}/absences`, {
                startDate,
                endDate,
                reason: reason.trim() || null,
            }),
        onSuccess: async () => {
            setStartDate("");
            setEndDate("");
            setReason("");
            await invalidate();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => axios.delete(`${apiURL}/v1/clubs/${clubId}/absences/${id}`),
        onSuccess: async () => {
            await invalidate();
        },
    });

    const canSubmit = startDate !== "" && endDate !== "" && endDate >= startDate;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarOff className="size-5 text-accentDark" />
                        {t("absence.create")}
                    </CardTitle>
                    <CardDescription>{t("absence.description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="absence-start">{t("absence.start")}</Label>
                            <Input
                                id="absence-start"
                                type="date"
                                value={startDate}
                                onChange={(event) => setStartDate(event.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="absence-end">{t("absence.end")}</Label>
                            <Input
                                id="absence-end"
                                type="date"
                                value={endDate}
                                min={startDate || undefined}
                                onChange={(event) => setEndDate(event.target.value)}
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="absence-reason">{t("absence.reason")}</Label>
                        <Input
                            id="absence-reason"
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            placeholder={t("absence.reasonPlaceholder") as string}
                        />
                    </div>
                    <Button onClick={() => createMutation.mutate()} disabled={!canSubmit || createMutation.isPending}>
                        {t("absence.add")}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t("absence.mine")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {mine.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("absence.empty")}</p>
                    ) : (
                        mine.map((absence) => (
                            <div
                                key={absence.id}
                                data-testid="absence-row"
                                className="flex items-center justify-between gap-2 rounded-lg border p-3"
                            >
                                <div>
                                    <p className="font-medium">
                                        {absence.startDate} – {absence.endDate}
                                    </p>
                                    {absence.reason && (
                                        <p className="text-xs text-muted-foreground">{absence.reason}</p>
                                    )}
                                </div>
                                <AlertDialog>
                                    <AlertDialogTrigger
                                        render={<Button variant="ghost" size="sm" aria-label={t("absence.delete") as string} />}
                                    >
                                        <Trash2 className="size-4 text-red-500" />
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>{t("absence.delete")}</AlertDialogTitle>
                                            <AlertDialogDescription>{t("absence.deleteConfirm")}</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => deleteMutation.mutate(absence.id)}>
                                                {t("absence.delete")}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            {canManage && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users2 className="size-5 text-accentDark" />
                            {t("absence.overview")}
                        </CardTitle>
                        <CardDescription>{t("absence.overviewDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {overview.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t("absence.empty")}</p>
                        ) : (
                            overview.map((absence) => (
                                <div key={absence.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                                    <div>
                                        <p className="font-medium">{absence.displayName || absence.userId}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {absence.startDate} – {absence.endDate}
                                            {absence.reason ? ` · ${absence.reason}` : ""}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
