import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Camera, Check, Copy, History, Loader2, Printer, Search, Tag, X } from "lucide-react";
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
import { printQrCode, renderQrDataUrl } from "@/src/utils/QrCode";
import { dismissEntry, type SweepReportSection } from "@/src/utils/SweepReport";
import { useDebounce } from "@/src/utils/DebounceHook";
import { compressImageForAI } from "@/src/utils/ImageUtils";
import { useDateFormat } from "@/src/hooks/useDateFormat";
import { useOnlineStatus } from "@/src/offline/useOnlineStatus";
import { getAllNotes, getRootFolders } from "@/src/offline/offlineDb";
import { rankOfflineCandidates } from "@/src/offline/inventoryMatching";
import {
    addPendingSighting,
    completePendingSweep,
    createPendingSweep,
    deleteIncompletePendingSweepsForFolder,
} from "@/src/offline/pendingSweeps";
import {
    dismissSyncedReports,
    pushPendingSweepsNow,
    refreshPendingCount,
    usePendingSweepSync,
} from "@/src/offline/pendingSweepSync";
import type {
    Folder,
    IdentifyCandidate,
    InventoryLookup,
    MappeTagResponse,
    SightingResult,
    SweepDetail,
    SweepHistoryEntry,
    SweepReport,
    SweepReportEntry,
} from "@/src/api/types";

const AUTO_ACCEPT_CONFIDENCE = 90;

type SweepState =
    | { phase: "idle" }
    // While sweeping offline, sweepId is the id of the local pending sweep. For reports of
    // pushed offline sweeps it is the server-side sweep id, so apply-moves works there too.
    | { phase: "sweeping"; sweepId: string; folderId: string; folderName: string; offline: boolean }
    | { phase: "report"; sweepId: string; folderName: string; report: SweepReport }
    // Local-only summary after finishing an offline sweep (full diff comes after sync).
    | { phase: "localReport"; folderName: string; entries: SightedEntry[] };

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
    const { formatDateOnly } = useDateFormat();
    const [searchParams, setSearchParams] = useSearchParams();
    const [state, setState] = useState<SweepState>({ phase: "idle" });
    const [sighted, setSighted] = useState<SightedEntry[]>([]);
    const [scanning, setScanning] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);
    const [candidates, setCandidates] = useState<IdentifyCandidate[] | null>(null);
    const [pageCheck, setPageCheck] = useState<{ candidate: IdentifyCandidate; via: string } | null>(null);
    const [lastStamp, setLastStamp] = useState<SightedEntry | null>(null);
    const [historyDetail, setHistoryDetail] = useState<SweepDetail | null>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const online = useOnlineStatus();
    const { pendingCount, syncedReports } = usePendingSweepSync();

    const { data: foldersData } = useQuery<Folder[]>({
        queryKey: ["inventory-folders", online],
        queryFn: async () =>
            online
                ? (await axios.get<Folder[]>(`${apiURL}/v1/elements/parentDecks`)).data
                : await getRootFolders(),
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

    /* Deep link: /inventory?folderId=<id>&folderName=<name> from the folder tree.
       The name rides along so no extra request is needed to label the sweep. */
    const folderIdParam = searchParams.get("folderId");
    useEffect(() => {
        if (!folderIdParam || state.phase !== "idle") return;
        const folderName = searchParams.get("folderName") ?? "";
        void startSweep(folderIdParam, folderName);
        setSearchParams({}, { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [folderIdParam]);

    const startSweep = async (folderId: string, folderName: string) => {
        let sweepId: string;
        if (online) {
            const created = (await axios.post(`${apiURL}/v1/inventory/sweeps`, { folderId })).data as {
                sweepId: string;
            };
            sweepId = created.sweepId;
        } else {
            // No backend reachable: queue the sweep locally and sync it on reconnect.
            await deleteIncompletePendingSweepsForFolder(folderId);
            sweepId = (await createPendingSweep(folderId, folderName)).id;
        }
        setSighted([]);
        setLastStamp(null);
        setScanError(null);
        setState({ phase: "sweeping", sweepId, folderId, folderName, offline: !online });
    };

    const recordSighting = async (candidate: IdentifyCandidate, via: string, incomplete: boolean) => {
        if (state.phase !== "sweeping") return;
        let entry: SightedEntry;
        let alreadySighted: boolean;
        if (state.offline) {
            const result = await addPendingSighting(state.sweepId, {
                noteId: candidate.noteId ?? "",
                name: candidate.name ?? "",
                matchedVia: via === "MANUAL" ? "MANUAL" : "OCR",
                confidence: via === "MANUAL" ? undefined : candidate.confidence,
                incomplete,
            });
            alreadySighted = result.alreadySighted;
            // Inventory numbers are assigned server-side — 0 means "after sync".
            entry = { noteId: candidate.noteId ?? "", name: candidate.name ?? "", inventoryNo: 0, incomplete };
        } else {
            const result = (
                await axios.post(`${apiURL}/v1/inventory/sweeps/${state.sweepId}/sightings`, {
                    noteId: candidate.noteId,
                    matchedVia: via,
                    confidence: candidate.confidence,
                    incomplete,
                })
            ).data as SightingResult;
            alreadySighted = result.alreadySighted ?? false;
            entry = {
                noteId: candidate.noteId ?? "",
                name: result.noteName ?? candidate.name ?? "",
                inventoryNo: result.inventoryNo ?? 0,
                incomplete,
            };
        }
        if (!alreadySighted) {
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
            let found: IdentifyCandidate[];
            if (state.offline) {
                // Local matching against the cached library — no AI fallback offline.
                found = rankOfflineCandidates(ocrText, await getAllNotes());
            } else {
                const { base64, mimeType } = await compressImageForAI(file);
                found = (
                    await axios.post(`${apiURL}/v1/inventory/identify`, {
                        ocrText,
                        imageBase64: base64,
                        mimeType,
                    })
                ).data as IdentifyCandidate[];
            }
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
        if (state.offline) {
            await completePendingSweep(state.sweepId);
            await refreshPendingCount();
            setState({ phase: "localReport", folderName: state.folderName, entries: sighted });
            return;
        }
        const report = (
            await axios.post(`${apiURL}/v1/inventory/sweeps/${state.sweepId}/complete`, {})
        ).data as SweepReport;
        setState({ phase: "report", sweepId: state.sweepId, folderName: state.folderName, report });
    };

    // Cancelling drops the sweep instead of leaving it open forever. Offline the
    // pending sweep is removed locally, so nothing is ever synced for it.
    const cancelSweep = async () => {
        if (state.phase !== "sweeping") return;
        try {
            if (state.offline) {
                await deleteIncompletePendingSweepsForFolder(state.folderId);
                await refreshPendingCount();
            } else {
                await axios.delete(`${apiURL}/v1/inventory/sweeps/${state.sweepId}`);
            }
        } catch {
            setScanError(t("inventory.scanFailed") as string);
            return;
        }
        setSighted([]);
        setLastStamp(null);
        setState({ phase: "idle" });
    };

    // "Seen it" — purely local. A still-missing note reappears in the next sweep.
    const dismiss = (section: SweepReportSection, noteId: string) => {
        setState((prev) =>
            prev.phase === "report" ? { ...prev, report: dismissEntry(prev.report, section, noteId) } : prev
        );
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
                    {syncedReports && syncedReports.length > 0 && (
                        <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium">
                                    {t("inventory.offlineSynced", { count: syncedReports.length })}
                                </p>
                                <Button variant="ghost" size="icon" onClick={dismissSyncedReports}>
                                    <X className="size-4" />
                                </Button>
                            </div>
                            {syncedReports.map((pushed) => (
                                <Button
                                    key={pushed.sweepId}
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start"
                                    onClick={() =>
                                        setState({
                                            phase: "report",
                                            sweepId: pushed.sweepId,
                                            folderName: pushed.folderName,
                                            report: pushed.report,
                                        })
                                    }
                                >
                                    {t("inventory.reportTitle", { folder: pushed.folderName })}
                                </Button>
                            ))}
                        </div>
                    )}
                    {pendingCount > 0 && (
                        <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
                            <p className="text-muted-foreground text-sm">
                                {t("inventory.pendingCount", { count: pendingCount })}
                            </p>
                            {online && (
                                <Button variant="outline" size="sm" onClick={() => pushPendingSweepsNow()}>
                                    {t("inventory.syncNow")}
                                </Button>
                            )}
                        </div>
                    )}
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
                                    online={online}
                                    onStart={() => startSweep(folder.id ?? "", folder.name ?? "")}
                                />
                            ))}
                        </CardContent>
                    </Card>
                    <FolderSearch onStart={startSweep} />
                    <OrphanFinder />
                    {online && (
                        <SweepHistory
                            detail={historyDetail}
                            onOpen={setHistoryDetail}
                            onClose={() => setHistoryDetail(null)}
                        />
                    )}
                </>
            )}

            {state.phase === "sweeping" && (
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {t("inventory.sweeping", { folder: state.folderName })}
                        </CardTitle>
                        <CardDescription>{t("inventory.sweepingHint")}</CardDescription>
                        {state.offline && (
                            <p className="text-muted-foreground text-xs">{t("inventory.offlineBanner")}</p>
                        )}
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
                            {sighted.length === 0 ? (
                                <Button variant="ghost" onClick={cancelSweep}>
                                    {t("inventory.cancelSweep")}
                                </Button>
                            ) : (
                                <AlertDialog>
                                    <AlertDialogTrigger render={<Button variant="ghost" />}>
                                        {t("inventory.cancelSweep")}
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>
                                                {t("inventory.cancelSweepConfirmTitle")}
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                {t("inventory.cancelSweepConfirmBody", { count: sighted.length })}
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>{t("inventory.cancelSweepKeep")}</AlertDialogCancel>
                                            <AlertDialogAction onClick={cancelSweep}>
                                                {t("inventory.cancelSweep")}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>

                        {lastStamp && (
                            <div className="rounded-lg border bg-muted/40 p-3 text-center">
                                <p className="text-muted-foreground text-xs">{lastStamp.name}</p>
                                {lastStamp.inventoryNo > 0 ? (
                                    <>
                                        <p className="text-2xl font-bold">
                                            {t("inventory.stamp", { no: lastStamp.inventoryNo })}
                                        </p>
                                        <p className="text-muted-foreground text-xs">{t("inventory.stampHint")}</p>
                                    </>
                                ) : (
                                    <p className="text-muted-foreground text-sm">
                                        {t("inventory.offlineNoNumber")}
                                    </p>
                                )}
                            </div>
                        )}

                        <div>
                            <p className="mb-1 text-sm font-medium">
                                {t("inventory.sightedCount", { count: sighted.length })}
                            </p>
                            <ul className="space-y-1">
                                {sighted.map((entry) => (
                                    <li key={entry.noteId} className="text-muted-foreground text-sm">
                                        {entry.inventoryNo > 0 ? `Nr. ${entry.inventoryNo} · ` : ""}
                                        {entry.name}
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
                        <ReportSection
                            title={t("inventory.present")}
                            entries={state.report.present ?? []}
                            onDismiss={(noteId) => dismiss("present", noteId)}
                        />
                        <ReportSection
                            title={t("inventory.newHere")}
                            entries={state.report.newHere ?? []}
                            onDismiss={(noteId) => dismiss("newHere", noteId)}
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
                            onDismiss={(noteId) => dismiss("missing", noteId)}
                            detail={(e) =>
                                e.lastSeenFolderName
                                    ? t("inventory.lastSeen", {
                                          folder: e.lastSeenFolderName,
                                          date: e.lastSeenAt ? formatDateOnly(e.lastSeenAt) : "?",
                                      })
                                    : t("inventory.neverSeen")
                            }
                        />
                        <ReportSection
                            title={t("inventory.incomplete")}
                            entries={state.report.incomplete ?? []}
                            tone="destructive"
                            onDismiss={(noteId) => dismiss("incomplete", noteId)}
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

            {state.phase === "localReport" && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t("inventory.reportTitle", { folder: state.folderName })}</CardTitle>
                        <CardDescription>{t("inventory.localReportHint")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="mb-1 text-sm font-semibold">
                                {t("inventory.present")} ({state.entries.length})
                            </p>
                            <ul className="space-y-1">
                                {state.entries.map((entry) => (
                                    <li key={entry.noteId} className="text-sm">
                                        {entry.name}
                                        {entry.incomplete ? (
                                            <span className="text-xs text-red-600">
                                                {" "}
                                                — {t("inventory.incompleteBadge")}
                                            </span>
                                        ) : null}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <Button variant="outline" onClick={() => setState({ phase: "idle" })}>
                            {t("inventory.done")}
                        </Button>
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

const FolderRow = ({ folder, online, onStart }: { folder: Folder; online: boolean; onStart: () => void }) => {
    const { t } = useTranslation();
    const [tag, setTag] = useState<MappeTagResponse | null>(null);
    const [copied, setCopied] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState("");
    const [printBlocked, setPrintBlocked] = useState(false);

    const bindTag = async () => {
        const response = (await axios.put(`${apiURL}/v1/inventory/folders/${folder.id}/tag`)).data as MappeTagResponse;
        setTag(response);
        setQrDataUrl(await renderQrDataUrl(response.url ?? ""));
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
                    {online && (
                        <Button variant="outline" size="sm" onClick={bindTag} title={t("inventory.bindTagHint") as string}>
                            <Tag className="mr-1 size-4" />
                            {t("inventory.bindTag")}
                        </Button>
                    )}
                    <Button size="sm" onClick={onStart}>
                        <Camera className="mr-1 size-4" />
                        {t("inventory.start")}
                    </Button>
                </div>
            </div>
            {tag && (
                <div className="mt-2 space-y-2">
                    <div className="flex gap-2">
                        <Input readOnly value={tag.url ?? ""} onFocus={(e) => e.target.select()} />
                        <Button type="button" variant="outline" size="icon" onClick={copyUrl}>
                            {copied ? <Check /> : <Copy />}
                        </Button>
                    </div>
                    {qrDataUrl && (
                        <div className="flex items-center gap-3">
                            <img
                                src={qrDataUrl}
                                alt={t("inventory.printTag") as string}
                                className="size-32 rounded border bg-white p-1"
                            />
                            <div className="space-y-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setPrintBlocked(!printQrCode(qrDataUrl, folder.name ?? ""))
                                    }
                                >
                                    <Printer className="mr-1 size-4" />
                                    {t("inventory.printTag")}
                                </Button>
                                <p className="text-muted-foreground text-xs">{t("inventory.qrHint")}</p>
                            </div>
                        </div>
                    )}
                    {printBlocked && <p className="text-sm text-red-600">{t("inventory.printBlocked")}</p>}
                    <p className="text-muted-foreground text-xs">{t("inventory.tagWriteHint")}</p>
                </div>
            )}
        </div>
    );
};

/* Any folder, at any depth, can be swept — the root list only covers the top
   level, which left nested Mappen out of the inventory entirely. */
const FolderSearch = ({ onStart }: { onStart: (folderId: string, folderName: string) => void }) => {
    const { t } = useTranslation();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Folder[] | null>(null);

    useDebounce(
        () => {
            const term = query.trim();
            if (term.length < 2) {
                setResults(null);
                return;
            }
            axios
                .get(`${apiURL}/v1/elements/folders`, { params: { page: 0, folderName: term } })
                .then((response) => {
                    const page = response.data as {
                        _embedded?: { elementRepresentationModelList?: Folder[] };
                    };
                    setResults(page._embedded?.elementRepresentationModelList ?? []);
                })
                .catch(() => setResults([]));
        },
        400,
        [query]
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("inventory.searchFolder")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <Input
                    value={query}
                    placeholder={t("inventory.searchFolderPlaceholder") as string}
                    onChange={(event) => setQuery(event.target.value)}
                />
                {results !== null && results.length === 0 && (
                    <p className="text-muted-foreground text-sm">{t("inventory.searchNoResults")}</p>
                )}
                {(results ?? []).map((folder) => (
                    <div key={folder.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                        <p className="truncate font-medium">{folder.name}</p>
                        <Button size="sm" onClick={() => onStart(folder.id ?? "", folder.name ?? "")}>
                            <Camera className="mr-1 size-4" />
                            {t("inventory.start")}
                        </Button>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
};

/* Completed sweeps were stored but unreachable: the report vanished with the
   screen. The history shows what a past pass actually found — deliberately the
   sighting list, not a recomputed diff (see the service comment). */
const SweepHistory = ({
    detail,
    onOpen,
    onClose,
}: {
    detail: SweepDetail | null;
    onOpen: (detail: SweepDetail) => void;
    onClose: () => void;
}) => {
    const { t } = useTranslation();
    const { formatDateTime } = useDateFormat();
    const { data } = useQuery<SweepHistoryEntry[]>({
        queryKey: ["inventory-sweeps"],
        queryFn: async () => (await axios.get<SweepHistoryEntry[]>(`${apiURL}/v1/inventory/sweeps`)).data,
    });
    const sweeps = data ?? [];

    const open = async (sweepId: string) => {
        const loaded = (await axios.get<SweepDetail>(`${apiURL}/v1/inventory/sweeps/${sweepId}`)).data;
        onOpen(loaded);
    };

    if (detail) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>
                        {t("inventory.historyDetailTitle", {
                            folder: detail.folderName,
                            date: formatDateTime(detail.completedAt),
                        })}
                    </CardTitle>
                    <CardDescription>{t("inventory.historyDetailHint")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <ul className="space-y-1">
                        {(detail.sightings ?? []).map((sighting) => (
                            <li key={sighting.noteId} className="text-sm">
                                <Link
                                    to={`/noteManagement/notes/${sighting.noteId}`}
                                    className="hover:text-accentDark hover:underline"
                                >
                                    {sighting.inventoryNo
                                        ? `${t("inventory.number", { no: sighting.inventoryNo })} · `
                                        : ""}
                                    {sighting.name}
                                </Link>
                                <span className="text-muted-foreground text-xs">
                                    {" "}
                                    — {t("inventory.matchedVia", { via: sighting.matchedVia })}
                                    {sighting.incomplete ? ` · ${t("inventory.incompleteBadge")}` : ""}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <Button variant="outline" onClick={onClose}>
                        {t("inventory.historyBack")}
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="size-5 text-accentDark" />
                    {t("inventory.historyTitle")}
                </CardTitle>
                <CardDescription>{t("inventory.historyHint")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {sweeps.length === 0 && (
                    <p className="text-muted-foreground text-sm">{t("inventory.historyEmpty")}</p>
                )}
                {sweeps.map((sweep) => (
                    <Button
                        key={sweep.sweepId}
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => sweep.sweepId && open(sweep.sweepId)}
                    >
                        <span className="truncate">{sweep.folderName}</span>
                        <span className="text-muted-foreground text-xs">
                            {formatDateTime(sweep.completedAt)} ·{" "}
                            {t("inventory.historyCount", { count: sweep.sightingCount ?? 0 })}
                        </span>
                    </Button>
                ))}
            </CardContent>
        </Card>
    );
};

const OrphanFinder = () => {
    const { t } = useTranslation();
    const { formatDateOnly } = useDateFormat();
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
                                    date: formatDateOnly(result.lastSeenAt),
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
    onDismiss,
}: {
    title: string;
    entries: SweepReportEntry[];
    detail?: (entry: SweepReportEntry) => string;
    tone?: "destructive";
    onDismiss?: (noteId: string) => void;
}) => {
    const { t } = useTranslation();
    if (entries.length === 0) return null;
    return (
        <div>
            <p className={`mb-1 text-sm font-semibold ${tone === "destructive" ? "text-red-600" : ""}`}>
                {title} ({entries.length})
            </p>
            <ul className="space-y-1">
                {entries.map((entry) => (
                    <li key={entry.noteId} className="flex items-start justify-between gap-2 text-sm">
                        <Link
                            to={`/noteManagement/notes/${entry.noteId}`}
                            className="hover:text-accentDark hover:underline"
                        >
                            {entry.inventoryNo ? `${t("inventory.number", { no: entry.inventoryNo })} · ` : ""}
                            {entry.name}
                            {detail && detail(entry) ? (
                                <span className="text-muted-foreground text-xs"> — {detail(entry)}</span>
                            ) : null}
                        </Link>
                        {onDismiss && entry.noteId && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-6 shrink-0"
                                title={t("inventory.dismiss") as string}
                                aria-label={t("inventory.dismiss") as string}
                                onClick={() => onDismiss(entry.noteId as string)}
                            >
                                <X className="size-3" />
                            </Button>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};
