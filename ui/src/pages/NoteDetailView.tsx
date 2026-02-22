import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ArrowLeft, ChevronLeft, ChevronRight, FileMusic, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { apiURL } from "@/src/Keycloak";
import { NoteDetail } from "@/src/models/NoteDetail";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const NoteDetailView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const { data, isLoading } = useQuery({
        queryKey: ["note", id],
        queryFn: async () => {
            const response = await axios.get<NoteDetail>(`${apiURL}/v1/elements/notes/${id}`);
            return response.data;
        },
        enabled: !!id,
    });

    const currentNote = data?.currentNote;
    const previousNote = data?.previousNote;
    const nextNote = data?.nextNote;

    const metaItems = useMemo(
        () => [
            { label: t("title"), value: currentNote?.name || "-" },
            { label: t("author"), value: currentNote?.author?.name || "-" },
            { label: t("description"), value: currentNote?.description || "-" },
            { label: t("numberOfPages"), value: String(currentNote?.numberOfPages ?? "-") },
            { label: t("superFolder"), value: currentNote?.parent?.name || "-" },
            { label: "Index im Ordner", value: String(data?.index ?? "-") },
        ],
        [currentNote, data?.index, t]
    );

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!currentNote) {
        return (
            <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6 md:py-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Note nicht gefunden</CardTitle>
                        <CardDescription>Die angeforderte Note ist nicht verfügbar.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => navigate("/noteManagement/notes")}>
                            <ArrowLeft className="mr-2 size-4" />
                            Zurück zur Suche
                        </Button>
                    </CardContent>
                </Card>
            </main>
        );
    }

    return (
        <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 md:px-6 md:py-8">
            <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-secondary/30 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight">{currentNote.name}</h1>
                        <p className="text-muted-foreground mt-2 text-sm">
                            {currentNote.author?.name} · {currentNote.parent?.name}
                        </p>
                    </div>
                    <Button variant="outline" onClick={() => navigate("/noteManagement/notes")}>
                        <ArrowLeft className="mr-2 size-4" />
                        Zurück zur Suche
                    </Button>
                </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileMusic className="size-5 text-primary" />
                            Notendetails
                        </CardTitle>
                        <CardDescription>Alle wichtigen Informationen zur gewählten Note.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {metaItems.map((item) => (
                            <div key={item.label} className="grid gap-1">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
                                <p className="text-sm">{item.value}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Navigation</CardTitle>
                        <CardDescription>Zwischen Noten im gleichen Ordner wechseln.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button
                            variant="outline"
                            className="w-full justify-between"
                            disabled={!previousNote}
                            onClick={() => previousNote && navigate(`/noteManagement/notes/${previousNote.id}`)}
                        >
                            <span className="truncate">{previousNote?.name || "Keine vorherige Note"}</span>
                            <ChevronLeft className="size-4" />
                        </Button>
                        <Separator />
                        <Button
                            variant="outline"
                            className="w-full justify-between"
                            disabled={!nextNote}
                            onClick={() => nextNote && navigate(`/noteManagement/notes/${nextNote.id}`)}
                        >
                            <span className="truncate">{nextNote?.name || "Keine nächste Note"}</span>
                            <ChevronRight className="size-4" />
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
};

