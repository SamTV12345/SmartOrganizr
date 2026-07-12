import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { $api, authFetch } from "@/src/api/client";
import { apiURL } from "@/src/Keycloak";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Eye, FileMusic, FileText, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

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
import { useOnlineStatus } from "@/src/offline/useOnlineStatus";
import { useQuery } from "@tanstack/react-query";
import { http as axios } from "@/src/api/client";
import type { InventoryLookup } from "@/src/api/types";

export const NoteDetailView = () => {
    const { id } = useParams();
    const { data: lastSeen } = useQuery<InventoryLookup>({
        queryKey: ["inventory-last-seen", id],
        queryFn: async () =>
            (await axios.get<InventoryLookup>(`${apiURL}/v1/inventory/notes/${id}/last-seen`)).data,
        enabled: !!id,
    });
    const navigate = useNavigate();
    const { t } = useTranslation();
    const isOnline = useOnlineStatus();

    const { data: rawData, isLoading } = $api.useQuery(
        "get",
        "/v1/elements/notes/{noteId}",
        { params: { path: { noteId: id ?? "" } } },
        { enabled: !!id }
    );

    const data = rawData as NoteDetail | undefined;
    const currentNote = data?.currentNote;
    const previousNote = data?.previousNote;
    const nextNote = data?.nextNote;

    const [pdfUrl, setPdfUrl] = useState<string>();
    const [showPdf, setShowPdf] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState(false);

    // Reset the viewer when navigating to another note; release the object URL.
    useEffect(() => {
        setShowPdf(false);
        setPdfError(false);
        setPdfUrl((old) => {
            if (old) URL.revokeObjectURL(old);
            return undefined;
        });
    }, [id]);

    const loadPdf = async (): Promise<string | undefined> => {
        if (pdfUrl) return pdfUrl;
        if (!id) return undefined;
        setPdfLoading(true);
        setPdfError(false);
        try {
            const response = await authFetch(`${apiURL}/v1/elements/${id}/pdf`);
            if (!response.ok) throw new Error(`status ${response.status}`);
            let blob = await response.blob();
            // Uploads store the PDF as a base64 data URL — convert it back to binary.
            if ((await blob.slice(0, 5).text()) === "data:") {
                blob = await (await fetch(await blob.text())).blob();
            }
            const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
            setPdfUrl(url);
            return url;
        } catch {
            setPdfError(true);
            return undefined;
        } finally {
            setPdfLoading(false);
        }
    };

    const onTogglePdf = async () => {
        if (showPdf) {
            setShowPdf(false);
            return;
        }
        const url = await loadPdf();
        if (url) setShowPdf(true);
    };

    const onDownloadPdf = async () => {
        const url = await loadPdf();
        if (!url) return;
        const link = document.createElement("a");
        link.href = url;
        link.download = `${currentNote?.name ?? "note"}.pdf`;
        link.click();
    };

    const metaItems = useMemo(
        () => [
            { label: t("title"), value: currentNote?.name || "-" },
            { label: t("author"), value: currentNote?.author?.name || "-" },
            { label: t("arranger"), value: currentNote?.arranger?.name || "-" },
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
                        {lastSeen?.lastSeenAt && (
                            <p className="text-muted-foreground mt-1 text-xs">
                                {t("inventory.lastSeen", {
                                    folder: lastSeen.lastSeenFolder,
                                    date: new Date(lastSeen.lastSeenAt).toLocaleDateString(),
                                })}
                            </p>
                        )}
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

            {currentNote.pdfAvailable && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="size-5 text-primary" />
                            PDF
                        </CardTitle>
                    </CardHeader>
                    {!isOnline ? (
                        <CardContent>
                            <p className="text-muted-foreground text-sm">{t("offline.pdfPlaceholder")}</p>
                        </CardContent>
                    ) : (
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-3">
                            <Button onClick={onTogglePdf} disabled={pdfLoading}>
                                {pdfLoading ? (
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                ) : (
                                    <Eye className="mr-2 size-4" />
                                )}
                                {showPdf ? t("hide-pdf") : t("show-pdf")}
                            </Button>
                            <Button variant="outline" onClick={onDownloadPdf} disabled={pdfLoading}>
                                <Download className="mr-2 size-4" />
                                {t("download-pdf")}
                            </Button>
                        </div>
                        {pdfError && <p className="text-sm text-red-500">{t("pdf-load-failed")}</p>}
                        {showPdf && pdfUrl && (
                            <iframe
                                src={pdfUrl}
                                title={currentNote.name}
                                className="h-[75vh] w-full rounded-lg border"
                            />
                        )}
                    </CardContent>
                    )}
                </Card>
            )}
        </main>
    );
};

