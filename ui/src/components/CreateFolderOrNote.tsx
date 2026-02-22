import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Camera, Loader, PlusIcon, ScanText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useRef, useState, type ChangeEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import axios from "axios";
import { apiURL } from "@/src/Keycloak";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FolderItem, FolderPostDto } from "@/src/models/Folder";
import { addAsParent, addChild } from "@/src/utils/ElementUtils";
import { NoteItem, NotePostDto } from "@/src/models/NoteItem";
import { ElementItem } from "@/src/models/ElementItem";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Label } from "@/components/ui/label";
import { ParentFolderSearchBar } from "@/src/components/searchBars/ParentFolderSearchBar";
import { NoteAuthorCreateSearchBar } from "@/src/components/searchBars/NoteAuthorCreateSearchBar";
import {
    setElementParentName,
    setElementSelectedAuthorName,
} from "@/src/ElementCreateSlice";
import { useAppDispatch } from "@/src/store/hooks";

/* ------------------------------------------------------------------ */
/* OCR helpers (module-level, never recreated)                         */
/* ------------------------------------------------------------------ */

type OcrLine = {
    text?: string;
    confidence?: number;
    bbox?: { x0?: number; x1?: number; y0?: number; y1?: number };
    words?: OcrWord[];
};
type OcrWord = {
    text?: string;
    confidence?: number;
    bbox?: { x0?: number; x1?: number; y0?: number; y1?: number };
};
type OcrParagraph = { lines?: OcrLine[] };
type OcrBlock = { paragraphs?: OcrParagraph[] };
type OcrData = { blocks?: OcrBlock[] };

const normalizeLine = (line: string): string =>
    line.replace(/\s+/g, " ").trim();

const cleanPotentialTitle = (line: string): string =>
    normalizeLine(line)
        .replace(/^[^A-Za-zÄÖÜäöüß0-9]+/, "")
        .replace(/[^A-Za-zÄÖÜäöüß0-9)\]]+$/, "")
        .trim();

const hasEnoughLetters = (line: string): boolean => {
    const letters = [...line].filter((c) =>
        /[A-Za-zÄÖÜäöüß]/.test(c)
    ).length;
    const nonWhitespace = [...line].filter((c) => !/\s/.test(c)).length;
    if (nonWhitespace === 0) return false;
    return letters >= 3 && letters / nonWhitespace >= 0.5;
};

const isLikelyAuthorLine = (line: string): boolean => {
    const normalized = normalizeLine(line);
    if (
        /^(by|von|arr\.?|arranged by|composer|composed by|music by|komponist|komponistin)\b/i.test(
            normalized
        )
    ) {
        return true;
    }
    const words = normalized.split(" ").filter(Boolean);
    return (
        words.length >= 2 &&
        words.length <= 4 &&
        normalized.length <= 35 &&
        words.every((word) => /^[A-ZÄÖÜ][a-zäöüß-]+$/.test(word))
    );
};

/**
 * Returns true for lines that look like publisher imprints, addresses,
 * copyright notices, catalogue numbers, or other non-title junk that
 * commonly appears on sheet music.
 *
 * Examples that should be filtered:
 *   "Scherzando Music Publ, P.O. Box, CH-6332 Hagendorn, Switzerland"
 *   "© 2003 by Universal Edition"
 *   "All rights reserved. Printed in Germany."
 *   "208.96"
 *   "www.henle.de"
 */
const isLikelyPublisherOrJunkLine = (line: string): boolean => {
    const n = normalizeLine(line);

    // Copyright / rights
    if (/©|℗|\(c\)|all rights reserved|printed in/i.test(n)) return true;

    // Web / e-mail
    if (/https?:\/\/|www\.|\.com|\.de|\.ch|\.at|@/.test(n)) return true;

    // P.O. Box or postal box patterns
    if (/p\.?\s*o\.?\s*box/i.test(n)) return true;

    // Country / ISO postal codes like "CH-6332", "D-80333", "A-1010"
    if (/\b[A-Z]{1,3}-\d{4,5}\b/.test(n)) return true;

    // Lines that contain 3+ comma-separated segments → address / imprint
    if ((n.match(/,/g) ?? []).length >= 2) return true;

    // Standalone number or number with dots (catalogue / plate numbers)
    if (/^\d[\d.\s-]*$/.test(n)) return true;

    // Lines containing a slash with digits on either side (e.g. "S tzerland 208.96")
    if (/\d\s*\/\s*\d/.test(n)) return true;

    // Known publisher keywords
    if (
        /\b(publ(ishing|isher|\.)?|edition|verlag|music\s+co|productions?|records?|gmbh|ltd|inc\.|s\.a\.|s\.r\.l\.)\b/i.test(
            n
        )
    )
        return true;

    // Country names that appear alone or with city info
    if (
        /\b(switzerland|germany|austria|france|italy|england|polska|nederland)\b/i.test(
            n
        )
    )
        return true;

    // Plate / catalogue numbers: mixed letters+digits token like "ED8765" or "HL00123"
    if (/\b[A-Z]{1,3}\d{3,}\b/.test(n)) return true;

    // Very long lines (>70 chars) are almost never titles on sheet music
    if (n.length > 70) return true;

    return false;
};

const fixCommonOcrTitleConfusions = (title: string): string => {
    const letters = [...title].filter((c) =>
        /[A-Za-zÄÖÜäöüß]/.test(c)
    ).length;
    const digits = [...title].filter((c) => /[0-9]/.test(c)).length;
    if (!(letters >= 4 && digits <= 2)) return title;

    return title
        .replace(/\b1\b/g, "I")
        .replace(/(?<=[A-Za-zÄÖÜäöüß])1(?=[A-Za-zÄÖÜäöüß])/g, "I")
        .replace(/(?<=[A-Za-zÄÖÜäöüß])0(?=[A-Za-zÄÖÜäöüß])/g, "O");
};

const extractLikelyTitleSegment = (line: string): string => {
    const normalized = normalizeLine(line);

    const upperRuns = [
        ...normalized.matchAll(
            /\b[A-ZÄÖÜ0-9][A-ZÄÖÜ0-9'’.-]*(?:\s+[A-ZÄÖÜ0-9][A-ZÄÖÜ0-9'’.-]*)+\b/g
        ),
    ].map((m) => m[0].trim());

    if (upperRuns.length === 0) return normalized;

    upperRuns.sort((a, b) => b.length - a.length);

    const best = upperRuns[0]
        .replace(/\b(ARR|ARR\.|ARRANGEMENT|EDITION)\b.*$/i, "")
        .trim();

    return best || normalized;
};

const extractTitleFromLineWords = (line: OcrLine): string => {
    const words = (line.words ?? [])
        .map((w) => ({
            text: cleanPotentialTitle(w.text ?? ""),
            confidence: Number(w.confidence ?? 0),
            x0: Number(w.bbox?.x0 ?? 0),
            x1: Number(w.bbox?.x1 ?? 0),
        }))
        .filter((w) => w.text.length > 0)
        .sort((a, b) => a.x0 - b.x0);

    if (words.length < 2) {
        return "";
    }

    // Remove likely leading OCR garbage token, e.g. "en" with very low confidence.
    while (
        words.length > 2 &&
        words[0].text.length <= 2 &&
        words[0].confidence < 45
    ) {
        words.shift();
    }

    if (words.length < 2) {
        return "";
    }

    let maxGap = -1;
    let splitAfter = -1;
    for (let i = 0; i < words.length - 1; i++) {
        const gap = words[i + 1].x0 - words[i].x1;
        if (gap > maxGap) {
            maxGap = gap;
            splitAfter = i;
        }
    }

    // Composer/arranger usually starts after a strong horizontal jump.
    const strongGap = maxGap >= 70;
    const leftWords =
        strongGap && splitAfter >= 1
            ? words.slice(0, splitAfter + 1)
            : words;

    const joined = normalizeLine(
        leftWords.map((w) => w.text).join(" ").replace(/\s*-\s*/g, " - ")
    );
    if (!joined || !hasEnoughLetters(joined)) {
        return "";
    }
    return joined;
};

const mergeDetachedHeaderSuffix = (
    title: string,
    bestLine: OcrLine,
    topLines: OcrLine[],
    maxY: number
): string => {
    const tokens = title.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return title;

    const lastToken = tokens[tokens.length - 1];
    if (!/^[A-Za-zÄÖÜäöüß-]{3,8}$/.test(lastToken)) return title;

    const bestBox = bestLine.bbox ?? {};
    const bestX0 = Number(bestBox.x0 ?? 0);
    const bestX1 = Number(bestBox.x1 ?? 0);
    const bestY0 = Number(bestBox.y0 ?? 0);
    const bestH = Math.max(1, Number(bestBox.y1 ?? 0) - bestY0);

    let foundSuffix = "";
    for (const line of topLines) {
        if (line === bestLine) continue;
        const raw = normalizeLine(line.text ?? "");
        if (!raw || raw.length > 12) continue;

        const conf = Number(line.confidence ?? 0);
        if (conf < 55) continue;

        const box = line.bbox ?? {};
        const y0 = Number(box.y0 ?? 0);
        const x0 = Number(box.x0 ?? 0);
        const x1 = Number(box.x1 ?? 0);

        if (y0 > maxY * 0.2) continue;
        if (Math.abs(y0 - bestY0) > bestH * 1.2) continue;
        if (x1 < bestX0 || x0 > bestX1) continue;

        const words = raw
            .split(/\s+/)
            .map((w) => w.replace(/[^A-Za-zÄÖÜäöüß]/g, ""))
            .filter(Boolean);
        if (words.length === 0 || words.length > 2) continue;

        const suffix =
            words.length === 2 && words[0].length === 1 ? words[1] : words.join("");
        if (!/^[a-zäöüß]{2,8}$/.test(suffix)) continue;

        foundSuffix = suffix;
        break;
    }

    if (!foundSuffix) return title;

    const merged = `${lastToken}${foundSuffix}`;
    if (!/^[A-Za-zÄÖÜäöüß-]{5,16}$/.test(merged)) return title;

    tokens[tokens.length - 1] = merged;
    return tokens.join(" ");
};

const extractNameFromOcr = (text: string, ocrData: unknown): string => {
    const blocks = (ocrData as OcrData | undefined)?.blocks ?? [];
    const topLines: OcrLine[] = [];

    let maxY = 0;
    for (const block of blocks) {
        for (const paragraph of block.paragraphs ?? []) {
            for (const line of paragraph.lines ?? []) {
                const y1 = line.bbox?.y1 ?? 0;
                if (y1 > maxY) maxY = y1;
                topLines.push(line);
            }
        }
    }
    if (maxY <= 0) maxY = 1;

    const candidates: Array<{
        text: string;
        confidence: number;
        height: number;
        y0: number;
        score: number;
        line: OcrLine;
    }> = [];

    for (const block of blocks) {
        for (const paragraph of block.paragraphs ?? []) {
            for (const line of paragraph.lines ?? []) {
                const lineText = cleanPotentialTitle(
                    normalizeLine(line.text ?? "")
                );

                if (lineText.length < 2 || !hasEnoughLetters(lineText))
                    continue;
                // Hard-exclude junk lines — no further scoring needed.
                if (isLikelyPublisherOrJunkLine(lineText)) continue;

                const bbox = line.bbox ?? {};
                const width = Math.max(0, (bbox.x1 ?? 0) - (bbox.x0 ?? 0));
                const height = Math.max(
                    0,
                    (bbox.y1 ?? 0) - (bbox.y0 ?? 0)
                );
                const y0 = Math.max(0, bbox.y0 ?? 0);
                // Titles are usually in the upper section; ignore lower staff noise.
                if (y0 > maxY * 0.3) continue;
                const confidence = Number(line.confidence ?? 0);
                if (confidence < 55) continue;

                const letterChars = [...lineText].filter((c) =>
                    /[A-Za-zÄÖÜäöüß]/.test(c)
                ).length;
                const upperCaseChars = [...lineText].filter((c) =>
                    /[A-ZÄÖÜ]/.test(c)
                ).length;
                const uppercaseRatio =
                    letterChars > 0 ? upperCaseChars / letterChars : 0;

                const area = width * height;
                const topOfPageBonus = 1 - y0 / maxY;
                const authorPenalty = isLikelyAuthorLine(lineText) ? 12 : 0;

                // Bonus for short-to-medium lines (titles are rarely >50 chars).
                // Score peaks at ~25 chars and fades toward 50.
                const lengthBonus =
                    lineText.length <= 50
                        ? Math.min(lineText.length, 25) / 25
                        : Math.max(0, 1 - (lineText.length - 50) / 20);

                // Bonus for fully-uppercase short lines ("STORIE DI TUTTI GIORNI").
                const allCapsBonus =
                    uppercaseRatio > 0.85 && lineText.length <= 50 ? 6 : 0;

                const score =
                    height * 5.5 +
                    Math.sqrt(Math.max(area, 1)) * 0.35 +
                    confidence * 0.25 +
                    lengthBonus * 6 +
                    uppercaseRatio * 3 +
                    topOfPageBonus * 7 +
                    allCapsBonus -
                    authorPenalty;

                candidates.push({
                    text: lineText,
                    confidence,
                    height,
                    y0,
                    score,
                    line,
                });
            }
        }
    }

    if (candidates.length > 0) {
        candidates.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.height !== a.height) return b.height - a.height;
            if (a.y0 !== b.y0) return a.y0 - b.y0;
            return b.confidence - a.confidence;
        });
        const best = candidates[0];
        const fromWords = extractTitleFromLineWords(best.line);
        const baseTitle = fromWords || best.text;
        const mergedTitle = mergeDetachedHeaderSuffix(
            baseTitle,
            best.line,
            topLines,
            maxY
        );
        const corrected = fixCommonOcrTitleConfusions(mergedTitle)
            .replace(/\b(arr\.?|arranged|composer|by|von)\b.*$/i, "")
            .replace(/\/.*$/, "")
            .trim();
        return extractLikelyTitleSegment(corrected).slice(0, 120);
    }

    // Fallback: plain-text heuristic when no bbox data is available.
    const fallbackLines = text
        .split("\n")
        .map(normalizeLine)
        .map(cleanPotentialTitle)
        .filter((line) => line.length > 0 && hasEnoughLetters(line))
        .filter((line) => !isLikelyAuthorLine(line))
        .filter((line) => !isLikelyPublisherOrJunkLine(line));

    if (fallbackLines.length === 0) return "";
    fallbackLines.sort((a, b) => b.length - a.length);
    const corrected = fixCommonOcrTitleConfusions(fallbackLines[0]);
    return extractLikelyTitleSegment(corrected).slice(0, 120);
};

const extractDescriptionFromOcr = (text: string, ocrData: unknown): string => {
    const blocks = (ocrData as OcrData | undefined)?.blocks ?? [];
    const lines: Array<{ text: string; confidence: number; y0: number }> = [];

    let maxY = 0;
    for (const block of blocks) {
        for (const paragraph of block.paragraphs ?? []) {
            for (const line of paragraph.lines ?? []) {
                const y1 = line.bbox?.y1 ?? 0;
                if (y1 > maxY) maxY = y1;
            }
        }
    }
    if (maxY <= 0) maxY = 1;

    for (const block of blocks) {
        for (const paragraph of block.paragraphs ?? []) {
            for (const line of paragraph.lines ?? []) {
                const raw = normalizeLine(line.text ?? "");
                const candidate = cleanPotentialTitle(raw);
                if (candidate.length < 3) continue;

                const y0 = Math.max(0, line.bbox?.y0 ?? 0);
                // Keep mostly header text; music staff OCR garbage dominates below.
                if (y0 > maxY * 0.34) continue;

                const confidence = Number(line.confidence ?? 0);
                if (confidence < 60) continue;
                if (!hasEnoughLetters(candidate)) continue;
                if (isLikelyPublisherOrJunkLine(candidate)) continue;

                const symbolCount = [...candidate].filter((c) =>
                    /[^A-Za-zÄÖÜäöüß0-9\s]/.test(c)
                ).length;
                const nonWhitespace = [...candidate].filter((c) => !/\s/.test(c))
                    .length;
                const symbolRatio =
                    nonWhitespace > 0 ? symbolCount / nonWhitespace : 1;
                if (symbolRatio > 0.2) continue;

                lines.push({ text: candidate, confidence, y0 });
            }
        }
    }

    if (lines.length > 0) {
        lines.sort((a, b) => {
            if (a.y0 !== b.y0) return a.y0 - b.y0;
            return b.confidence - a.confidence;
        });

        const unique: string[] = [];
        for (const item of lines) {
            if (!unique.some((u) => u.toLowerCase() === item.text.toLowerCase())) {
                unique.push(item.text);
            }
        }

        return unique.slice(0, 4).join("\n");
    }

    // Fallback to a clean subset from plain OCR text.
    return text
        .split("\n")
        .map(normalizeLine)
        .map(cleanPotentialTitle)
        .filter((line) => line.length >= 3 && hasEnoughLetters(line))
        .filter((line) => !isLikelyPublisherOrJunkLine(line))
        .slice(0, 4)
        .join("\n");
};

const extractPagesFromText = (text: string, fallback: number): number => {
    const match = text.match(/(\d{1,3})\s*(seiten|seite|pages?|p\.)/i);
    if (match?.[1]) {
        const parsed = Number(match[1]);
        if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    }
    return fallback > 0 ? fallback : 1;
};

/* ------------------------------------------------------------------ */
/* Zod schemas (module-level, never recreated)                         */
/* ------------------------------------------------------------------ */

const folderSchema = z.object({
    type: z.literal("folder"),
    name: z.string().min(1),
    description: z.string(),
    parentId: z.string(),
});

const noteSchema = z.object({
    type: z.literal("note"),
    name: z.string().min(1),
    description: z.string(),
    numberOfPages: z.number().min(1),
    authorId: z.string().min(1),
    parentId: z.string().min(1),
    extraInformation: z.string(),
});

const schema = z.discriminatedUnion("type", [folderSchema, noteSchema]);

type FormValues = z.infer<typeof schema>;

/* ------------------------------------------------------------------ */
/* Default values                                                      */
/* ------------------------------------------------------------------ */

const FOLDER_DEFAULTS: Extract<FormValues, { type: "folder" }> = {
    type: "folder",
    name: "",
    description: "",
    parentId: "",
};

const NOTE_DEFAULTS: Extract<FormValues, { type: "note" }> = {
    type: "note",
    name: "",
    description: "",
    parentId: "",
    authorId: "",
    numberOfPages: 1,
    extraInformation: "",
};

/* ------------------------------------------------------------------ */
/* API helpers (module-level)                                          */
/* ------------------------------------------------------------------ */

const createFolder = async (folder: FolderPostDto): Promise<FolderItem> => {
    const response = await axios.post(
        `${apiURL}/v1/elements/folders`,
        folder
    );
    return response.data;
};

const createNote = async (note: NotePostDto): Promise<NoteItem> => {
    const response = await axios.post(`${apiURL}/v1/elements/notes`, note);
    return response.data;
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function CreateFolderOrNote() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const dispatch = useAppDispatch();
    const [open, setOpen] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);
    const cameraInputRef = useRef<HTMLInputElement | null>(null);

    const form = useForm<FormValues>({
        resolver: standardSchemaResolver(schema),
        defaultValues: FOLDER_DEFAULTS,
    });

    const watchType = useWatch({ control: form.control, name: "type" });

    /* ------------------------------------------------------------------ */
    /* Reset helpers                                                       */
    /* ------------------------------------------------------------------ */

    const resetDispatch = () => {
        dispatch(setElementParentName(""));
        dispatch(setElementSelectedAuthorName(""));
    };

    const closeAndResetForm = () => {
        setOpen(false);
        setScanError(null);
        form.reset(FOLDER_DEFAULTS);
        resetDispatch();
    };

    const resetForNextEntry = (createdType: "folder" | "note") => {
        const parentId = form.getValues("parentId");
        setScanError(null);

        if (createdType === "folder") {
            form.reset({ ...FOLDER_DEFAULTS, parentId: parentId ?? "" });
        } else {
            const currentValues = form.getValues() as Extract<
                FormValues,
                { type: "note" }
            >;
            form.reset({
                ...NOTE_DEFAULTS,
                parentId: parentId ?? "",
                authorId: currentValues.authorId ?? "",
            });
        }
    };

    /* ------------------------------------------------------------------ */
    /* Mutations                                                           */
    /* ------------------------------------------------------------------ */

    const updateCache = (data: FolderItem | NoteItem) => {
        queryClient.setQueryData(
            ["folders"],
            (nodes: ElementItem[] = []) =>
                data.parent
                    ? addChild(data, nodes, data.parent.id)
                    : addAsParent(data, nodes)
        );
    };

    const createFolderMutation = useMutation<FolderItem, Error, FolderPostDto>(
        {
            mutationFn: createFolder,
            onSuccess: (data) => {
                updateCache(data);
                resetForNextEntry("folder");
            },
        }
    );

    const createNoteMutation = useMutation<NoteItem, Error, NotePostDto>({
        mutationFn: createNote,
        onSuccess: (data) => {
            updateCache(data);
            resetForNextEntry("note");
        },
    });

    const isPending =
        createFolderMutation.isPending || createNoteMutation.isPending;

    /* ------------------------------------------------------------------ */
    /* Submit                                                              */
    /* ------------------------------------------------------------------ */

    const onSubmit = (values: FormValues) => {
        console.log("CreateFolderOrNote submit values:", {
            type: values.type,
            parentId: values.parentId,
            authorId: values.type === "note" ? values.authorId : undefined,
            name: values.name,
        });

        if (values.type === "folder") {
            createFolderMutation.mutate(values);
        } else {
            createNoteMutation.mutate(values);
        }
    };

    /* ------------------------------------------------------------------ */
    /* Camera / OCR                                                        */
    /* ------------------------------------------------------------------ */

    const triggerCameraScan = () => {
        setScanError(null);
        cameraInputRef.current?.click();
    };

    const handleCameraFileChange = async (
        event: ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        setScanError(null);

        try {
            const tesseractModule = await import("tesseract.js");
            const createWorker =
                tesseractModule.createWorker ??
                tesseractModule.default?.createWorker;
            if (!createWorker) throw new Error("OCR worker is not available.");

            const worker = await createWorker("deu+eng");
            const result = await worker.recognize(
                file,
                {},
                { text: true, blocks: true }
            );
            await worker.terminate();

            const scannedText = (result?.data?.text ?? "").trim();
            if (!scannedText) {
                setScanError(t("scanNoTextFound"));
                return;
            }

            const currentValues = form.getValues() as Extract<
                FormValues,
                { type: "note" }
            >;
            const currentDescription = currentValues.description ?? "";
            const currentName = currentValues.name ?? "";
            const currentPages = currentValues.numberOfPages ?? 1;

            const nameFromScan = extractNameFromOcr(scannedText, result?.data);
            const scannedDescription = extractDescriptionFromOcr(
                scannedText,
                result?.data
            );
            const mergedDescription = currentDescription
                ? `${currentDescription}\n\n${scannedDescription}`
                : scannedDescription;

            form.setValue("description", mergedDescription, {
                shouldDirty: true,
            });

            if (!currentName && nameFromScan) {
                form.setValue("name", nameFromScan, { shouldDirty: true });
            }

            if (watchType === "note") {
                (
                    form.setValue as (
                        name: "numberOfPages",
                        value: number
                    ) => void
                )(
                    "numberOfPages",
                    extractPagesFromText(scannedText, currentPages)
                );
            }
        } catch (error) {
            console.error(error);
            setScanError(t("scanFailed"));
        } finally {
            setIsScanning(false);
            if (event.target) event.target.value = "";
        }
    };

    /* ------------------------------------------------------------------ */
    /* Render                                                              */
    /* ------------------------------------------------------------------ */

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) {
                    closeAndResetForm();
                    return;
                }
                setOpen(nextOpen);
            }}
        >
            <DialogTrigger asChild>
                <Button variant="outline" className="float-right mr-5 mt-5">
                    <PlusIcon />
                </Button>
            </DialogTrigger>

            <DialogContent>
                <DialogTitle className="border-b pb-2 text-3xl font-semibold">
                    Ordner oder Musiknote erstellen
                </DialogTitle>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-8"
                    >
                        {/* TYPE */}
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <RadioGroup
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            className="grid grid-cols-2 gap-4"
                                        >
                                            <div className="flex items-center gap-2">
                                                <RadioGroupItem
                                                    value="folder"
                                                    id="folder"
                                                />
                                                <Label htmlFor="folder">
                                                    Ordner
                                                </Label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <RadioGroupItem
                                                    value="note"
                                                    id="note"
                                                />
                                                <Label htmlFor="note">
                                                    Musiknote
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        {/* NAME */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("name")}</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* DESCRIPTION */}
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("description")}</FormLabel>
                                    <FormControl>
                                        <textarea
                                            value={field.value}
                                            onChange={field.onChange}
                                            className="min-h-24 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        {/* NOTE ONLY */}
                        {watchType === "note" && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="numberOfPages"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                {t("numberOfPages")}
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    {...field}
                                                    onChange={(e) =>
                                                        field.onChange(
                                                            e.target
                                                                .valueAsNumber
                                                        )
                                                    }
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="space-y-2 rounded-md border p-3">
                                    <div className="text-sm font-medium">
                                        {t("scanNoteSheet")}
                                    </div>
                                    <div className="text-muted-foreground text-xs">
                                        {t("scanNoteSheetHint")}
                                    </div>
                                    <input
                                        ref={cameraInputRef}
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        className="hidden"
                                        onChange={handleCameraFileChange}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={triggerCameraScan}
                                        disabled={isScanning}
                                        className="w-full"
                                    >
                                        {isScanning ? (
                                            <>
                                                <Loader className="mr-2 animate-spin" />
                                                {t("scanning")}
                                            </>
                                        ) : (
                                            <>
                                                <Camera className="mr-2" />
                                                <ScanText className="mr-2" />
                                                {t("scanWithCamera")}
                                            </>
                                        )}
                                    </Button>
                                    {scanError && (
                                        <p className="text-sm text-destructive">
                                            {scanError}
                                        </p>
                                    )}
                                </div>

                                <FormField
                                    control={form.control}
                                    name="extraInformation"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                {t("extraInformation")}
                                            </FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}

                        <ParentFolderSearchBar />

                        {watchType === "note" && <NoteAuthorCreateSearchBar />}

                        <DialogFooter>
                            <DialogClose asChild>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={closeAndResetForm}
                                >
                                    {t("cancel")}
                                </Button>
                            </DialogClose>

                            <Button type="submit" disabled={isPending}>
                                {isPending && (
                                    <Loader className="mr-2 animate-spin" />
                                )}
                                {t("save")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
