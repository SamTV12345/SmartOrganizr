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
    Loader,
    PlusIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
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

export function CreateFolderOrNote() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

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
        numberOfPages: z
            .number()
            .refine((v) => !Number.isNaN(v), {
                message: t("fieldRequired")!,
            }),
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

    /* ------------------------------------------------------------------ */
    /* Render                                                              */
    /* ------------------------------------------------------------------ */

    return (
        <Dialog>
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
                                        <Input {...field} />
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
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

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