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
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { http as axios, parentDecksQueryKey } from "@/src/api/client";
import { apiURL } from "@/src/Keycloak";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
    extractDescriptionFromOcr,
    extractAuthorFromOcr,
    extractNameFromOcr,
    extractPagesFromText,
} from "@/src/utils/OcrScanUtils";
import { Author } from "@/src/models/Author";
import { Page } from "@/src/models/Page";
import { AuthorEmbeddedContainer } from "@/src/models/AuthorEmbeddedContainer";
import { WorkAutocompleteInput } from "@/src/components/searchBars/WorkAutocompleteInput";
import { AuthorConflictDialog } from "@/src/components/AuthorConflictDialog";
import { createWorkFromWikidata } from "@/src/api/autocomplete";
import type {
    AutocompleteAuthor,
    AutocompleteWork,
    WorkFromWikidataConflict,
} from "@/src/models/Autocomplete";

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
    description: z.string().optional(),
    numberOfPages: z.number().min(1),
    authorId: z.string(),
    authorName: z.string().min(1),
    parentId: z.string().min(1),
    extraInformation: z.string().optional(),
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
    authorName: "",
    numberOfPages: 1,
    extraInformation: "",
};

const CREATE_ANOTHER_STORAGE_KEY = "createAnother:elements";

const readCreateAnother = (): boolean => {
    try {
        return localStorage.getItem(CREATE_ANOTHER_STORAGE_KEY) === "true";
    } catch {
        return false;
    }
};

const writeCreateAnother = (value: boolean): void => {
    try {
        localStorage.setItem(CREATE_ANOTHER_STORAGE_KEY, String(value));
    } catch {
        // localStorage unavailable (privacy mode, SSR) — silently ignore
    }
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

const normalizeAuthorName = (authorName: string): string =>
    authorName.replace(/\s+/g, " ").trim();

const findAuthorByName = async (authorName: string): Promise<Author | null> => {
    const response = await axios.get<Page<AuthorEmbeddedContainer<Author>>>(
        `${apiURL}/v1/authors?page=0&name=${encodeURIComponent(authorName)}`
    );

    const authors = response.data._embedded?.authorRepresentationModelList ?? [];
    const normalizedNeedle = normalizeAuthorName(authorName).toLocaleLowerCase();

    const exactMatch = authors.find(
        (author) => normalizeAuthorName(author.name).toLocaleLowerCase() === normalizedNeedle
    );

    return exactMatch ?? null;
};

const findOrCreateAuthorId = async (authorName: string): Promise<string> => {
    const normalizedName = normalizeAuthorName(authorName);
    const existingAuthor = await findAuthorByName(normalizedName);
    if (existingAuthor?.id) return existingAuthor.id;

    const response = await axios.post<Author>(`${apiURL}/v1/authors`, {
        name: normalizedName,
        extraInformation: "",
    });
    return response.data.id;
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
    const [scannedPdfContent, setScannedPdfContent] = useState("");
    const [createAnother, setCreateAnotherState] = useState<boolean>(readCreateAnother);
    const [justSaved, setJustSaved] = useState(false);
    const justSavedTimerRef = useRef<number | null>(null);
    const nameInputRef = useRef<HTMLInputElement | null>(null);

    // Wikidata flow state. pendingWikidata holds the original external pick so
    // the conflict-resolution buttons can retry the same work.
    const [conflict, setConflict] = useState<WorkFromWikidataConflict | null>(null);
    const [pendingWikidata, setPendingWikidata] = useState<AutocompleteWork | null>(null);
    const [wikidataError, setWikidataError] = useState<string | null>(null);

    const setCreateAnother = (value: boolean) => {
        setCreateAnotherState(value);
        writeCreateAnother(value);
    };

    useEffect(() => {
        return () => {
            if (justSavedTimerRef.current !== null) {
                window.clearTimeout(justSavedTimerRef.current);
            }
        };
    }, []);

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
        if (justSavedTimerRef.current !== null) {
            window.clearTimeout(justSavedTimerRef.current);
            justSavedTimerRef.current = null;
        }
        setJustSaved(false);
        setOpen(false);
        setScanError(null);
        setScannedPdfContent("");
        form.reset(FOLDER_DEFAULTS);
        resetDispatch();
    };

    const flashJustSaved = () => {
        setJustSaved(true);
        if (justSavedTimerRef.current !== null) {
            window.clearTimeout(justSavedTimerRef.current);
        }
        justSavedTimerRef.current = window.setTimeout(() => {
            setJustSaved(false);
            justSavedTimerRef.current = null;
        }, 1500);
    };

    const handlePostSubmit = () => {
        setScanError(null);
        setScannedPdfContent("");

        if (createAnother) {
            flashJustSaved();
            // Form-Werte bleiben unverändert. Fokus aufs Name-Feld + Selektion.
            window.setTimeout(() => {
                nameInputRef.current?.focus();
                nameInputRef.current?.select();
            }, 0);
            return;
        }

        closeAndResetForm();
    };

    /* ------------------------------------------------------------------ */
    /* Mutations                                                           */
    /* ------------------------------------------------------------------ */

    const updateCache = (data: FolderItem | NoteItem) => {
        queryClient.setQueryData(
            parentDecksQueryKey,
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
                handlePostSubmit();
            },
        }
    );

    const createNoteMutation = useMutation<NoteItem, Error, NotePostDto>({
        mutationFn: createNote,
        onSuccess: (data) => {
            updateCache(data);
            handlePostSubmit();
        },
    });

    const isPending =
        createFolderMutation.isPending || createNoteMutation.isPending;

    /* ------------------------------------------------------------------ */
    /* Wikidata external-pick flow                                         */
    /* ------------------------------------------------------------------ */

    // Picking a Wikidata entry only PRE-FILLS the form. The actual POST runs
    // on submit (see onSubmit). pendingWikidata acts as the "submit-via-
    // wikidata" flag — present means submit will POST /works/from-wikidata
    // instead of POST /elements/notes.
    const handleWikidataPick = (work: AutocompleteWork) => {
        setWikidataError(null);
        setPendingWikidata(work);
        form.setValue("name", work.name);
        if (work.description) {
            form.setValue("description", work.description);
        }
        if (work.composer?.name) {
            form.setValue("authorName", work.composer.name);
            dispatch(setElementSelectedAuthorName(work.composer.name));
        }
    };

    // submitWikidataPick performs the actual POST. Called from onSubmit and
    // from the conflict-resolution buttons (which need to retry after a
    // PATCH or with forceNewAuthor=true).
    const submitWikidataPick = async (
        work: AutocompleteWork,
        opts: { forceNewAuthor?: boolean } = {},
    ) => {
        setWikidataError(null);
        const parentId = form.getValues("parentId");
        if (!parentId) {
            setWikidataError(t("wikidata.parentRequired", "Bitte zuerst einen übergeordneten Ordner wählen.") as string);
            return;
        }
        try {
            const result = await createWorkFromWikidata({
                wikidataId: work.wikidataId!,
                parentId,
                forceNewAuthor: opts.forceNewAuthor,
            });
            if ("conflict" in result) {
                setConflict(result.conflict);
                return;
            }
            updateCache(result.note);
            setConflict(null);
            setPendingWikidata(null);
            handlePostSubmit();
        } catch (err) {
            console.error(err);
            const e = err as { response?: { status: number; data: { error?: string } } };
            if (e.response?.data?.error?.includes("Duplicate entry")) {
                setWikidataError(
                    t(
                        "wikidata.alreadyExists",
                        "Dieses Werk hast du bereits in deiner Sammlung.",
                    ) as string,
                );
            } else {
                setWikidataError(t("wikidata.createFailed", "Werk konnte nicht angelegt werden.") as string);
            }
        }
    };

    const handleConflictLinkExisting = async (candidate: AutocompleteAuthor) => {
        if (!conflict || !pendingWikidata || !candidate.id) return;
        try {
            await axios.patch(`${apiURL}/v1/authors/${candidate.id}`, {
                name: candidate.name,
                extraInformation: "",
                wikidataId: conflict.incoming.wikidataId,
                birthYear: conflict.incoming.birthYear,
                deathYear: conflict.incoming.deathYear,
            });
        } catch (err) {
            console.error(err);
            setWikidataError(t("wikidata.linkFailed", "Verknüpfen fehlgeschlagen.") as string);
            return;
        }
        setConflict(null);
        submitWikidataPick(pendingWikidata);
    };

    const handleConflictCreateNew = () => {
        if (!pendingWikidata) return;
        setConflict(null);
        submitWikidataPick(pendingWikidata, { forceNewAuthor: true });
    };

    const handleConflictCancel = () => {
        setConflict(null);
        setPendingWikidata(null);
    };

    /* ------------------------------------------------------------------ */
    /* Submit                                                              */
    /* ------------------------------------------------------------------ */

    const onSubmit = async (values: FormValues) => {
        console.log("CreateFolderOrNote submit values:", {
            type: values.type,
            parentId: values.parentId,
            authorId: values.type === "note" ? values.authorId : undefined,
            authorName: values.type === "note" ? values.authorName : undefined,
            name: values.name,
            wikidata: pendingWikidata?.wikidataId,
        });

        // Wikidata branch: short-circuit the normal create path. The backend
        // resolves the composer (and may return 409 -> conflict dialog).
        if (values.type === "note" && pendingWikidata) {
            await submitWikidataPick(pendingWikidata);
            return;
        }

        if (values.type === "folder") {
            createFolderMutation.mutate(values);
        } else {
            const normalizedAuthorName = normalizeAuthorName(values.authorName);
            if (!normalizedAuthorName) {
                form.setError("authorName", {
                    type: "manual",
                    message: t("fieldRequired") as string,
                });
                return;
            }

            let resolvedAuthorId = values.authorId;
            if (!resolvedAuthorId) {
                try {
                    resolvedAuthorId = await findOrCreateAuthorId(normalizedAuthorName);
                } catch (error) {
                    console.error(error);
                    form.setError("authorName", {
                        type: "manual",
                        message: t("authorResolveFailed") as string,
                    });
                    return;
                }
            }

            createNoteMutation.mutate({
                name: values.name,
                description: values.description ?? "",
                numberOfPages: values.numberOfPages,
                parentId: values.parentId,
                authorId: resolvedAuthorId,
                pdfContent: scannedPdfContent || undefined,
            });
        }
    };

    /* ------------------------------------------------------------------ */
    /* Camera / OCR                                                        */
    /* ------------------------------------------------------------------ */

    const triggerCameraScan = () => {
        setScanError(null);
        cameraInputRef.current?.click();
    };

    const readFileAsDataUrl = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ""));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });

    const handleCameraFileChange = async (
        event: ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        setScanError(null);

        try {
            const scannedImageDataUrl = await readFileAsDataUrl(file);
            setScannedPdfContent(scannedImageDataUrl);

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
            const currentAuthorName = currentValues.authorName ?? "";

            const nameFromScan = extractNameFromOcr(scannedText, result?.data);
            const authorFromScan = extractAuthorFromOcr(scannedText, result?.data);
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

                if (!currentAuthorName && authorFromScan) {
                    (
                        form.setValue as (
                            name: "authorName",
                            value: string,
                            options: { shouldDirty: boolean; shouldValidate: boolean }
                        ) => void
                    )("authorName", authorFromScan, {
                        shouldDirty: true,
                        shouldValidate: true,
                    });
                    (
                        form.setValue as (
                            name: "authorId",
                            value: string,
                            options: { shouldDirty: boolean; shouldValidate: boolean }
                        ) => void
                    )("authorId", "", {
                        shouldDirty: true,
                        shouldValidate: true,
                    });
                    dispatch(setElementSelectedAuthorName(authorFromScan));
                }
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
            <DialogTrigger render={<Button variant="outline" className="float-right mr-5 mt-5" />}>
                <PlusIcon />
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
                                        {watchType === "note" ? (
                                            <WorkAutocompleteInput
                                                value={field.value ?? ""}
                                                onChange={(v) => {
                                                    field.onChange(v);
                                                    // User edited the name after picking a
                                                    // Wikidata entry — drop the pick so submit
                                                    // takes the normal create path.
                                                    if (pendingWikidata && v !== pendingWikidata.name) {
                                                        setPendingWikidata(null);
                                                    }
                                                }}
                                                onPickLocal={(w) => {
                                                    // Local hit: fill name + author from
                                                    // composer if present. Don't auto-submit.
                                                    form.setValue("name", w.name);
                                                    if (w.composer) {
                                                        if (w.composer.id) {
                                                            form.setValue("authorId", w.composer.id);
                                                        }
                                                        if (w.composer.name) {
                                                            form.setValue("authorName", w.composer.name);
                                                            dispatch(setElementSelectedAuthorName(w.composer.name));
                                                        }
                                                    }
                                                }}
                                                onPickExternal={(w) => handleWikidataPick(w)}
                                                placeholder={t("name") as string}
                                            />
                                        ) : (
                                            <Input
                                                {...field}
                                                ref={(el) => {
                                                    field.ref(el);
                                                    nameInputRef.current = el;
                                                }}
                                            />
                                        )}
                                    </FormControl>
                                    {wikidataError && watchType === "note" && (
                                        <p className="text-sm text-destructive">
                                            {wikidataError}
                                        </p>
                                    )}
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
                                    {!scanError && scannedPdfContent && (
                                        <p className="text-sm text-emerald-600">
                                            {t("scanImageWillBeUploaded")}
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

                        <DialogFooter className="sm:justify-between">
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox
                                    checked={createAnother}
                                    onCheckedChange={(checked) => setCreateAnother(checked === true)}
                                />
                                Weitere erstellen
                            </label>

                            <div className="flex gap-2">
                                <DialogClose
                                    render={
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={closeAndResetForm}
                                        />
                                    }
                                >
                                    {t("cancel")}
                                </DialogClose>

                                <Button type="submit" disabled={isPending}>
                                    {isPending && (
                                        <Loader className="mr-2 animate-spin" />
                                    )}
                                    {justSaved ? "✓ Gespeichert" : t("save")}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
            <AuthorConflictDialog
                conflict={conflict}
                onLinkExisting={handleConflictLinkExisting}
                onCreateNew={handleConflictCreateNew}
                onCancel={handleConflictCancel}
            />
        </Dialog>
    );
}

