import { FC } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { http as axios } from "@/src/api/client";
import { apiURL } from "@/src/Keycloak";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3 } from "lucide-react";

// Mirrors dto.AttendanceStatsDto (served by GET /v1/clubs/{id}/stats/attendance).
// Typed locally rather than via the generated schema: the http shim needs no
// generated types, and the OpenAPI->TS emit is broken by the repo's typescript
// preview pin (see the design spec).
type MemberRate = {
    userId: string;
    displayName: string;
    sectionId?: string;
    sectionName?: string;
    eligibleTotal: number;
    attendedTotal: number;
    rateTotal: number;
    eligibleWindow: number;
    attendedWindow: number;
    rateWindow: number;
};

type SectionRate = {
    sectionId?: string;
    sectionName: string;
    memberCount: number;
    eligibleTotal: number;
    attendedTotal: number;
    rateTotal: number;
    rateWindow: number;
};

type AttendanceStats = {
    windowDays: number;
    members: MemberRate[];
    sections: SectionRate[];
};

const pct = (rate: number) => `${Math.round(rate * 100)}%`;

const RateBar: FC<{ rate: number; label: string }> = ({ rate, label }) => (
    <div className="flex items-center gap-2" aria-label={label} title={label}>
        <div className="h-2 w-full min-w-16 overflow-hidden rounded bg-muted">
            <div
                className="h-full rounded bg-accentDark"
                style={{ width: `${Math.max(0, Math.min(100, rate * 100))}%` }}
            />
        </div>
        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{pct(rate)}</span>
    </div>
);

type Props = { clubId: string };

export const ClubStatsSection: FC<Props> = ({ clubId }) => {
    const { t } = useTranslation();
    const { data, isLoading, isError } = useQuery({
        queryKey: ["club-attendance-stats", clubId],
        queryFn: async () => (await axios.get<AttendanceStats>(`${apiURL}/v1/clubs/${clubId}/stats/attendance`)).data,
    });

    if (isLoading) {
        return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
    }
    if (isError || !data) {
        return <p className="text-sm text-red-600">Statistik konnte nicht geladen werden.</p>;
    }

    const windowDays = data.windowDays;
    const sections = data.sections ?? [];
    const members = data.members ?? [];

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="size-5 text-accentDark" />
                        Anwesenheit pro Register
                    </CardTitle>
                    <CardDescription>
                        Anteil der zugesagten Teilnahmen an vergangenen, nicht abgesagten Terminen.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {sections.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Noch keine Daten vorhanden.</p>
                    ) : (
                        sections.map((s) => (
                            <div key={s.sectionId || "__none__"} className="grid items-center gap-2 md:grid-cols-[10rem_1fr]">
                                <div className="text-sm font-medium">
                                    {s.sectionName || "Ohne Register"}
                                    <span className="ml-1 text-xs text-muted-foreground">
                                        ({s.memberCount})
                                    </span>
                                </div>
                                <RateBar
                                    rate={s.rateTotal}
                                    label={`${s.attendedTotal}/${s.eligibleTotal}`}
                                />
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Anwesenheit pro Mitglied</CardTitle>
                    <CardDescription>Gesamt und in den letzten {windowDays} Tagen.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Mitglied</TableHead>
                                    <TableHead>Register</TableHead>
                                    <TableHead className="min-w-40">Gesamt</TableHead>
                                    <TableHead className="min-w-40">{windowDays} Tage</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {members.map((m) => (
                                    <TableRow key={m.userId}>
                                        <TableCell className="font-medium">{m.displayName}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {m.sectionName || "—"}
                                        </TableCell>
                                        <TableCell>
                                            <RateBar rate={m.rateTotal} label={`${m.attendedTotal}/${m.eligibleTotal}`} />
                                        </TableCell>
                                        <TableCell>
                                            <RateBar rate={m.rateWindow} label={`${m.attendedWindow}/${m.eligibleWindow}`} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
