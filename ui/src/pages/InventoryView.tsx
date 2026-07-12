import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Camera, Check, Copy, Loader2, Search, Tag, X } from "lucide-react";
import { http as axios } from "@/src/api/client";
import { apiURL } from "@/src/Keycloak";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogTitle,
} from "@/components/ui/dialog";
import { compressImageForAI } from "@/src/utils/ImageUtils";
import type {
    Folder,
    IdentifyCandidate,
    InventoryLookup,
    MappeTagResponse,
    SightingResult,
    SweepReport,
    SweepReportEntry,
} from "@/src/api/types";

const AUTO_ACCEPT_CONFIDENCE = 90;

type SweepState =
    | { phase: "idle" }
    | { phase: "sweeping"; sweepId: string; folderId: string; folderName: string }
    | { phase: "report"; sweepId: string; folderName: string; report: SweepReport };

type SightedEntry = { noteId: string; name: string; inventoryNo: number; incomplete: boolean };

async function ocrImage(file: File): Promise<string> {
    const tesseractModule = await import("tesseract.js");
    const createWorker = tesseractModule.createWorker ?? tesseractModule.default?.createWorker;
    if (!createWorker) throw new Error("OCR worker is not available.");
    const worker = await createWorker("deu+eng");
    try {
        const result = await worker.recognize(file, {}, { text: true });
        return (result?.data?.text ?? "").trim();
    } finally {
        await worker.terminate();
    }
}

export const InventoryView = () => {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [state, setState] = useState<SweepState>({ phase: "idle" });
    const [sighted, setSighted] = useState<SightedEntry[]>([]);
    const [scanning, setScanning] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);
    const [candidates, setCandidates] = useState<IdentifyCandidate[] | null>(null);
    const [pageCheck, setPageCheck] = useState<{ candidate: IdentifyCandidate; via: string } | null>(null);
    const [lastStamp, setLastStamp] = useState<SightedEntry | null>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const { data: foldersData } = useQuery<Folder[]>({
        queryKey: ["inventory-folders"],
        queryFn: async () => (await axios.get<Folder[]>(`${apiURL}/v1/elements/parentDecks`)).data,
    });
    const folders = foldersData ?? [];

    /* Deep link: /ui/inventory?tag=<uuid> jumps straight into a sweep. */
    const tagParam = searchParams.get("tag");
    useEffect(() => {
        if (!tagParam || state.phase !== "idle") return;
        let cancelled = false;
        (async () => {
            try {
                const resolved = (await axios.get(`${apiURL}/v1/inventory/tags/${tagParam}`)).data as {
                    folderId: string;
                    folderName: string;
                };
                if (!cancelled) {
                    await startSweep(resolved.folderId, resolved.folderName);
                    setSearchParams({}, { replace: true });
                }
            } catch {
                if (!cancelled) setScanError(t("inventory.tagNotFound") as string);
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tagParam]);

    const startSweep = async (folderId: string, folderName: string) => {
        const created = (await axios.post(`${apiURL}/v1/inventory/sweeps`, { folderId })).data as {
            sweepId: string;
        };
        setSighted([]);
        setLastStamp(null);
        setScanError(null);
        setState({ phase: "sweeping", sweepId: created.sweepId, folderId, folderName });
    };

    const recordSighting = async (candidate: IdentifyCandidate, via: string, incomplete: boolean) => {
        if (state.phase !== "sweeping") return;
        const result = (
            await axios.post(`${apiURL}/v1/inventory/sweeps/${state.sweepId}/sightings`, {
                noteId: candidate.noteId,
                matchedVia: via,
                confidence: candidate.confidence,
                incomplete,
            })
        ).data as SightingResult;
        const entry: SightedEntry = {
            noteId: candidate.noteId ?? "",
            name: result.noteName ?? candidate.name ?? "",
            inventoryNo: result.inventoryNo ?? 0,
            incomplete,
        };
        if (!result.alreadySighted) {
            setSighted((prev) => [entry, ...prev]);
        }
        setLastStamp(entry);
        setCandidates(null);
        setPageCheck(null);
    };

    const handlePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file || state.phase !== "sweeping") return;
        setScanning(true);
        setScanError(null);
        try {
            const ocrText = await ocrImage(file);
            const { base64, mimeType } = await compressImageForAI(file);
            const found = (
                await axios.post(`${apiURL}/v1/inventory/identify`, {
                    ocrText,
                    imageBase64: base64,
                    mimeType,
                })
            ).data as IdentifyCandidate[];
            if (found.length === 0) {
                setScanError(t("inventory.noMatch") as string);
            } else if ((found[0].confidence ?? 0) >= AUTO_ACCEPT_CONFIDENCE) {
                setPageCheck({ candidate: found[0], via: found[0].matchedVia ?? "OCR" });
            } else {
                setCandidates(found);
            }
        } catch {
            setScanError(t("inventory.scanFailed") as string);
        } finally {
            setScanning(false);
        }
    };

    const completeSweep = async () => {
        if (state.phase !== "sweeping") return;
        const report = (
            await axios.post(`${apiURL}/v1/inventory/sweeps/${state.sweepId}/complete`, {})
        ).data as SweepReport;
        setState({ phase: "report", sweepId: state.sweepId, folderName: state.folderName, report });
    };

    const applyMoves = async () => {
        if (state.phase !== "report") return;
        const noteIds = (state.report.newHere ?? []).map((e) => e.noteId).filter(Boolean);
        if (noteIds.length === 0) return;
        await axios.post(`${apiURL}/v1/inventory/sweeps/${state.sweepId}/apply-moves`, { noteIds });
        setState({
            ...state,
            report: {
                ...state.report,
                present: [...(state.report.present ?? []), ...(state.report.newHere ?? [])],
                newHere: [],
            },
        });
    };

    return (
        <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
            <header>
                <h1 className="text-2xl font-semibold tracking-tight">{t("inventory.title")}</h1>
                <p className="text-muted-foreground text-sm">{t("inventory.subtitle")}</p>
            </header>

            {scanError && <p className="text-sm text-red-600">{scanError}</p>}

            {state.phase === "idle" && (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("inventory.pickFolder")}</CardTitle>
                            <CardDescription>{t("inventory.pickFolderHint")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {folders.length === 0 && (
                                <p className="text-muted-foreground text-sm">{t("inventory.noFolders")}</p>
                            )}
                            {folders.map((folder) => (
                                <FolderRow
                                    key={folder.id}
                                    folder={folder}
                                    onStart={() => startSweep(folder.id ?? "", folder.name ?? "")}
                                />
                            ))}
                        </CardContent>
                    </Card>
                    <OrphanFinder />
                </>
            )}

            {state.phase === "sweeping" && (
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {t("inventory.sweeping", { folder: state.folderName })}
                        </CardTitle>
                        <CardDescription>{t("inventory.sweepingHint")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handlePhoto}
                        />
                        <div className="flex gap-2">
                            <Button
                                className="flex-1"
                                disabled={scanning}
                                onClick={() => cameraInputRef.current?.click()}
                            >
                                {scanning ? <Loader2 className="mr-2 animate-spin" /> : <Camera className="mr-2" />}
                                {scanning ? t("inventory.scanning") : t("inventory.scanSheet")}
                            </Button>
                            <Button variant="outline" onClick={completeSweep}>
                                {t("inventory.finish")}
                            </Button>
                        </div>

                        {lastStamp && (
                            <div className="rounded-lg border bg-muted/40 p-3 text-center">
                                <p className="text-muted-foreground text-xs">{lastStamp.name}</p>
                                <p className="text-2xl font-bold">
                                    {t("inventory.stamp", { no: lastStamp.inventoryNo })}
                                </p>
                                <p className="text-muted-foreground text-xs">{t("inventory.stampHint")}</p>
                            </div>
                        )}

                        <div>
                            <p className="mb-1 text-sm font-medium">
                                {t("inventory.sightedCount", { count: sighted.length })}
                            </p>
                            <ul className="space-y-1">
                                {sighted.map((entry) => (
                                    <li key={entry.noteId} className="text-muted-foreground text-sm">
                                        Nr. {entry.inventoryNo} · {entry.name}
                                        {entry.incomplete ? ` — ${t("inventory.incompleteBadge")}` : ""}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            )}

            {state.phase === "report" && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t("inventory.reportTitle", { folder: state.folderName })}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ReportSection title={t("inventory.present")} entries={state.report.present ?? []} />
                        <ReportSection
                            title={t("inventory.newHere")}
                            entries={state.report.newHere ?? []}
                            detail={(e) =>
                                e.previousFolderName
                                    ? t("inventory.movedFrom", { folder: e.previousFolderName })
                                    : ""
                            }
                        />
                        <ReportSection
                            title={t("inventory.missing")}
                            entries={state.report.missing ?? []}
                            tone="destructive"
                            detail={(e) =>
                                e.lastSeenFolderName
                                    ? t("inventory.lastSeen", {
                                          folder: e.lastSeenFolderName,
                                          date: e.lastSeenAt ? new Date(e.lastSeenAt).toLocaleDateString() : "?",
                                      })
                                    : t("inventory.neverSeen")
                            }
                        />
                        <ReportSection
                            title={t("inventory.incomplete")}
                            entries={state.report.incomplete ?? []}
                            tone="destructive"
                        />
                        <div className="flex gap-2">
                            {(state.report.newHere ?? []).length > 0 && (
                                <Button onClick={applyMoves}>{t("inventory.applyMoves")}</Button>
                            )}
                            <Button variant="outline" onClick={() => setState({ phase: "idle" })}>
                                {t("inventory.done")}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Candidate pick dialog (uncertain match) */}
            <Dialog open={candidates !== null} onOpenChange={(o) => !o && setCandidates(null)}>
                <DialogContent>
                    <DialogTitle>{t("inventory.pickCandidate")}</DialogTitle>
                    <div className="space-y-2">
                        {(candidates ?? []).map((candidate) => (
                            <Button
                                key={candidate.noteId}
                                variant="outline"
                                className="w-full justify-between"
                                onClick={() => setPageCheck({ candidate, via: "MANUAL" })}
                            >
                                <span className="truncate">{candidate.name}</span>
                                <span className="text-muted-foreground text-xs">{candidate.confidence}%</span>
                            </Button>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setCandidates(null)}>
                            {t("inventory.skip")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Page-count check before the sighting is recorded */}
            <Dialog open={pageCheck !== null} onOpenChange={(o) => !o && setPageCheck(null)}>
                <DialogContent>
                    <DialogTitle>{pageCheck?.candidate.name}</DialogTitle>
                    <p className="text-sm">
                        {pageCheck?.candidate.numberOfPages
                            ? t("inventory.pageCheck", { count: pageCheck.candidate.numberOfPages })
                            : t("inventory.pageCheckUnknown")}
                    </p>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => pageCheck && recordSighting(pageCheck.candidate, pageCheck.via, true)}
                        >
                            <X className="mr-2 size-4" />
                            {t("inventory.pagesIncomplete")}
                        </Button>
                        <Button
                            onClick={() => pageCheck && recordSighting(pageCheck.candidate, pageCheck.via, false)}
                        >
                            <Check className="mr-2 size-4" />
                            {t("inventory.pagesComplete")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    );
};

const FolderRow = ({ folder, onStart }: { folder: Folder; onStart: () => void }) => {
    const { t } = useTranslation();
    const [tag, setTag] = useState<MappeTagResponse | null>(null);
    const [copied, setCopied] = useState(false);

    const bindTag = async () => {
        const response = (await axios.put(`${apiURL}/v1/inventory/folders/${folder.id}/tag`)).data as MappeTagResponse;
        setTag(response);
    };

    const copyUrl = async () => {
        if (!tag?.url) return;
        try {
            await navigator.clipboard.writeText(tag.url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            // clipboard unavailable — the URL stays selectable in the input
        }
    };

    return (
        <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{folder.name}</p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={bindTag} title={t("inventory.bindTagHint") as string}>
                        <Tag className="mr-1 size-4" />
                        {t("inventory.bindTag")}
                    </Button>
                    <Button size="sm" onClick={onStart}>
                        <Camera className="mr-1 size-4" />
                        {t("inventory.start")}
                    </Button>
                </div>
            </div>
            {tag && (
                <div className="mt-2 space-y-1">
                    <div className="flex gap-2">
                        <Input readOnly value={tag.url ?? ""} onFocus={(e) => e.target.select()} />
                        <Button type="button" variant="outline" size="icon" onClick={copyUrl}>
                            {copied ? <Check /> : <Copy />}
                        </Button>
                    </div>
                    <p className="text-muted-foreground text-xs">{t("inventory.tagWriteHint")}</p>
                </div>
            )}
        </div>
    );
};

const OrphanFinder = () => {
    const { t } = useTranslation();
    const [number, setNumber] = useState("");
    const [result, setResult] = useState<InventoryLookup | null>(null);
    const [notFound, setNotFound] = useState(false);

    const lookup = async () => {
        setResult(null);
        setNotFound(false);
        if (!number.trim()) return;
        try {
            const found = (await axios.get(`${apiURL}/v1/inventory/lookup`, {
                params: { no: number.trim() },
            })).data as InventoryLookup;
            setResult(found);
        } catch {
            setNotFound(true);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("inventory.orphanTitle")}</CardTitle>
                <CardDescription>{t("inventory.orphanHint")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex gap-2">
                    <Input
                        inputMode="numeric"
                        placeholder="421"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && lookup()}
                    />
                    <Button onClick={lookup}>
                        <Search className="mr-1 size-4" />
                        {t("inventory.lookup")}
                    </Button>
                </div>
                {notFound && <p className="text-sm text-red-600">{t("inventory.numberUnknown")}</p>}
                {result && (
                    <div className="rounded-lg border bg-muted/40 p-3">
                        <p className="font-medium">{result.name}</p>
                        <p className="text-muted-foreground text-sm">
                            {t("inventory.belongsTo", { folder: result.folderName || "—" })}
                        </p>
                        {result.lastSeenAt && (
                            <p className="text-muted-foreground text-xs">
                                {t("inventory.lastSeen", {
                                    folder: result.lastSeenFolder,
                                    date: new Date(result.lastSeenAt).toLocaleDateString(),
                                })}
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const ReportSection = ({
    title,
    entries,
    detail,
    tone,
}: {
    title: string;
    entries: SweepReportEntry[];
    detail?: (entry: SweepReportEntry) => string;
    tone?: "destructive";
}) => {
    if (entries.length === 0) return null;
    return (
        <div>
            <p className={`mb-1 text-sm font-semibold ${tone === "destructive" ? "text-red-600" : ""}`}>
                {title} ({entries.length})
            </p>
            <ul className="space-y-1">
                {entries.map((entry) => (
                    <li key={entry.noteId} className="text-sm">
                        {entry.inventoryNo ? `Nr. ${entry.inventoryNo} · ` : ""}
                        {entry.name}
                        {detail && detail(entry) ? (
                            <span className="text-muted-foreground text-xs"> — {detail(entry)}</span>
                        ) : null}
                    </li>
                ))}
            </ul>
        </div>
    );
};
