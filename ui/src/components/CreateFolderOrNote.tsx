import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Camera,
    Loader,
    PlusIcon,
    ScanText,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
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
import {Label} from "@/components/ui/label";
import {ParentFolderSearchBar} from "@/src/components/searchBars/ParentFolderSearchBar";
import {NoteAuthorCreateSearchBar} from "@/src/components/searchBars/NoteAuthorCreateSearchBar";
import {setElementParentName, setElementSelectedAuthorName} from "@/src/ElementCreateSlice";
import {useAppDispatch} from "@/src/store/hooks";

export function CreateFolderOrNote() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const dispatch = useAppDispatch();
    const [open, setOpen] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);
    const cameraInputRef = useRef<HTMLInputElement | null>(null);

    /* ------------------------------------------------------------------ */
    /* Zod 4 schemas                                                      */
    /* ------------------------------------------------------------------ */

    const folderSchema = z.object({
        type: z.literal("folder"),
        name: z.string().min(1, { message: t("fieldRequired")! }),
        description: z.string().default(""),
        parentId: z.string().default(""),
    });

    const noteSchema = z.object({
        type: z.literal("note"),
        name: z.string().min(1, { message: t("fieldRequired")! }),
        description: z.string().default(""),
        numberOfPages: z.preprocess(
            (v) => typeof v === "string" ? Number(v) : v,
            z.number()),
        authorId: z.string().min(1, { message: t("fieldRequired")! }),
        parentId: z.string().min(1, { message: t("fieldRequired")! }),
        extraInformation: z.string().default(""),
    });

    const schema = z.discriminatedUnion("type", [
        folderSchema,
        noteSchema,
    ]);

    type FormValues = z.infer<typeof schema>;

    /* ------------------------------------------------------------------ */
    /* React Hook Form                                                     */
    /* ------------------------------------------------------------------ */

    const form = useForm({
        resolver: standardSchemaResolver(schema),
        defaultValues: {
            type: "folder",
            name: "",
            description: "",
            parentId: "",
        },
    });

    const watchType = useWatch({
        control: form.control,
        name: "type",
    });

    useEffect(() => {
        if (watchType === "note" && !form.getValues("numberOfPages" as never)) {
            form.setValue("numberOfPages" as never, 1 as never);
        }
    }, [watchType, form]);

    /* ------------------------------------------------------------------ */
    /* API calls                                                           */
    /* ------------------------------------------------------------------ */

    const createFolder = async (folder: FolderPostDto) => {
        const response = await axios.post(
            `${apiURL}/v1/elements/folders`,
            folder
        );
        return response.data;
    };

    const createNote = async (note: NotePostDto) => {
        const response = await axios.post(
            `${apiURL}/v1/elements/notes`,
            note
        );
        return response.data;
    };

    const closeAndResetForm = () => {
        setOpen(false);
        setScanError(null);
        form.reset({
            type: "folder",
            name: "",
            description: "",
            parentId: "",
            authorId: "",
            numberOfPages: 1,
            extraInformation: "",
        } as never);
        dispatch(setElementParentName(""));
        dispatch(setElementSelectedAuthorName(""));
    };

    const resetForNextEntry = (createdType: "folder" | "note") => {
        const parentId = form.getValues("parentId" as never) as unknown as string;
        const authorId = form.getValues("authorId" as never) as unknown as string;
        form.reset({
            type: createdType,
            name: "",
            description: "",
            parentId: parentId ?? "",
            authorId: authorId ?? "",
            numberOfPages: 1,
            extraInformation: "",
        } as never);
        setScanError(null);
    };

    const createFolderMutation = useMutation<
        FolderItem,
        Error,
        FolderPostDto
    >({
        mutationFn: createFolder,
        onSuccess: (data) => {
            queryClient.setQueryData(
                ["folders"],
                (nodes: ElementItem[] = []) =>
                    data.parent
                        ? addChild(data, nodes, data.parent.id)
                        : addAsParent(data, nodes)
            );
            resetForNextEntry("folder");
        },
    });

    const createNoteMutation = useMutation<
        NoteItem,
        Error,
        NotePostDto
    >({
        mutationFn: createNote,
        onSuccess: (data) => {
            queryClient.setQueryData(
                ["folders"],
                (nodes: ElementItem[] = []) =>
                    data.parent
                        ? addChild(data, nodes, data.parent.id)
                        : addAsParent(data, nodes)
            );
            resetForNextEntry("note");
        },
    });

    /* ------------------------------------------------------------------ */
    /* Submit                                                              */
    /* ------------------------------------------------------------------ */

    const onSubmit = (values: FormValues) => {
        if (values.type === "folder") {
            createFolderMutation.mutate(values);
        } else {
            createNoteMutation.mutate(values);
        }
    };

    const extractNameFromText = (text: string): string => {
        const lines = text
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
        if (lines.length === 0) {
            return "";
        }
        return lines[0].slice(0, 120);
    };

    const extractPagesFromText = (text: string, fallback: number): number => {
        const match = text.match(/(\d{1,3})\s*(seiten|seite|pages?|p\.)/i);
        if (match && match[1]) {
            const parsed = Number(match[1]);
            if (!Number.isNaN(parsed) && parsed > 0) {
                return parsed;
            }
        }
        return fallback > 0 ? fallback : 1;
    };

    const triggerCameraScan = () => {
        setScanError(null);
        cameraInputRef.current?.click();
    };

    const handleCameraFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        setIsScanning(true);
        setScanError(null);
        try {
            const tesseractModule = await import("tesseract.js");
            const createWorker =
                tesseractModule.createWorker ??
                tesseractModule.default?.createWorker;
            if (!createWorker) {
                throw new Error("OCR worker is not available.");
            }

            const worker = await createWorker("eng");
            const result = await worker.recognize(file);
            await worker.terminate();

            const scannedText = (result?.data?.text ?? "").trim();
            if (!scannedText) {
                setScanError(t("scanNoTextFound"));
                return;
            }

            const currentDescription =
                (form.getValues("description") as unknown as string) ?? "";
            const currentName = (form.getValues("name") as unknown as string) ?? "";
            const currentPages = Number(
                form.getValues("numberOfPages" as never) as unknown as number
            );

            const nameFromScan = extractNameFromText(scannedText);
            const mergedDescription = currentDescription
                ? `${currentDescription}\n\n${scannedText}`
                : scannedText;

            form.setValue("description", mergedDescription, { shouldDirty: true });
            if (!currentName && nameFromScan) {
                form.setValue("name", nameFromScan, { shouldDirty: true });
            }
            form.setValue(
                "numberOfPages" as never,
                extractPagesFromText(scannedText, currentPages) as never,
                { shouldDirty: true }
            );
        } catch (error) {
            console.error(error);
            setScanError(t("scanFailed"));
        } finally {
            setIsScanning(false);
            if (event.target) {
                event.target.value = "";
            }
        }
    };

    /* ------------------------------------------------------------------ */
    /* Render                                                              */
    /* ------------------------------------------------------------------ */

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => {
            if (!nextOpen) {
                closeAndResetForm();
                return;
            }
            setOpen(nextOpen);
        }}>
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
                                                <RadioGroupItem value="folder" id="folder" />
                                                <Label htmlFor="folder">Ordner</Label>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <RadioGroupItem value="note" id="note" />
                                                <Label htmlFor="note">Musiknote</Label>
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
                                            <FormLabel>{t("numberOfPages")}</FormLabel>
                                            <FormControl>
                                                {/* @ts-ignore */}
                                                <Input type="number" {...field} />
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
                                        <p className="text-sm text-destructive">{scanError}</p>
                                    )}
                                </div>

                                <FormField
                                    control={form.control}
                                    name="extraInformation"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("extraInformation")}</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}
                        <ParentFolderSearchBar/>
                        {
                            watchType === 'note' && (
                                    <NoteAuthorCreateSearchBar/>
                            )
                        }

                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">
                                    {t("cancel")}
                                </Button>
                            </DialogClose>

                            <Button type="submit">
                                {(createFolderMutation.isPending ||
                                    createNoteMutation.isPending) && (
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
