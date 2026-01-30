import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader } from "lucide-react";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";

import { apiURL } from "@/src/Keycloak";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";

import { cn } from "./NavigationButton";
import { Page } from "@/src/models/Page";
import { FolderEmbeddedContainer } from "@/src/models/FolderEmbeddedContainer";
import { FolderItem, FolderPostDto } from "@/src/models/Folder";
import { NoteItem, NotePutDto } from "@/src/models/NoteItem";
import { AuthorEmbeddedContainer } from "@/src/models/AuthorEmbeddedContainer";
import { Author } from "@/src/models/Author";
import {
    ElementItem,
    isFolder,
} from "@/src/models/ElementItem";
import {
    replaceFolder,
    replaceNote,
} from "@/src/utils/ElementUtils";

/* ------------------------------------------------------------------ */
/* Props                                                              */
/* ------------------------------------------------------------------ */

export type UpdateFolderOrNoteProps = {
    element: ElementItem;
    trigger: React.ReactNode;
    onDelete: (elementId: string) => void;
};

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export function UpdateFolderOrNote({
                                       element,
                                       trigger,
                                       onDelete,
                                   }: UpdateFolderOrNoteProps) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [confirmDelete, setConfirmDelete] = useState(false);

    /* ------------------------------------------------------------------ */
    /* Zod 4 schemas                                                      */
    /* ------------------------------------------------------------------ */

    const folderSchema = z.object({
        type: z.literal("folder"),
        name: z.string().min(1, { message: t("fieldRequired")! }),
        description: z.string().optional(),
        parentId: z.string().optional(),
    });

    const noteSchema = z.object({
        type: z.literal("note"),
        name: z.string().min(1, { message: t("fieldRequired")! }),
        description: z.string().optional(),
        numberOfPages: z.number(),
        authorId: z.string().min(1, { message: t("fieldRequired")! }),
        parentId: z.string()
    });

    const schema = z.discriminatedUnion("type", [
        folderSchema,
        noteSchema,
    ]);

    type FormValues = z.infer<typeof schema>;

    /* ------------------------------------------------------------------ */
    /* Default values mapper (IMPORTANT)                                  */
    /* ------------------------------------------------------------------ */
    const form = useForm({
        resolver: standardSchemaResolver(schema)
    });

    useEffect(() => {
        if (element.type === "folder") {
            form.reset({
                type: "folder",
                name: element.name ?? "",
                description: element.description ?? "",
                parentId: element.parent?.id ?? "",
            });
        } else {
            form.reset({
                type: "note",
                name: element.name ?? "",
                description: element.description ?? "",
                numberOfPages: element.numberOfPages ?? 0,
                authorId: element.author?.id ?? "",
                parentId: element.parent?.id ?? ""
            });
        }
    }, [element, form]);


    /* ------------------------------------------------------------------ */
    /* React Hook Form                                                    */
    /* ------------------------------------------------------------------ */



    /* ------------------------------------------------------------------ */
    /* Delete                                                            */
    /* ------------------------------------------------------------------ */

    const deleteElement = async () => {
        await axios.delete(`${apiURL}/v1/elements/${element.id}`);
    };

    const deleteMutation = useMutation({
        mutationFn: deleteElement,
        onSuccess: () => onDelete(element.id),
    });

    useEffect(() => {
        if (!confirmDelete) return;
        const timer = setTimeout(() => setConfirmDelete(false), 5000);
        return () => clearTimeout(timer);
    }, [confirmDelete]);

    /* ------------------------------------------------------------------ */
    /* Update API                                                         */
    /* ------------------------------------------------------------------ */

    const updateFolder = async (folder: FolderPostDto) => {
        const response = await axios.patch(
            `${apiURL}/v1/elements/folders/${element.id}`,
            folder
        );
        return response.data;
    };

    const updateNote = async (note: NotePutDto) => {
        const response = await axios.patch(
            `${apiURL}/v1/elements/notes/${element.id}`,
            note
        );
        return response.data;
    };

    const updateFolderMutation = useMutation<
        FolderItem,
        Error,
        FolderPostDto
    >({
        mutationFn: updateFolder,
        onSuccess: (data) => {
            queryClient.setQueryData(
                ["folders"],
                (nodes: ElementItem[] = []) =>
                    replaceFolder(data, nodes)
            );
        },
    });

    const updateNoteMutation = useMutation<
        NoteItem,
        Error,
        NotePutDto
    >({
        mutationFn: updateNote,
        onSuccess: (data) => {
            queryClient.setQueryData(
                ["folders"],
                (nodes: ElementItem[] = []) =>
                    replaceNote(data, nodes)
            );
        },
    });

    /* ------------------------------------------------------------------ */
    /* Submit                                                             */
    /* ------------------------------------------------------------------ */

    const onSubmit = (values: FormValues) => {
        if (values.type === "folder") {
            updateFolderMutation.mutate(values);
        } else {
            updateNoteMutation.mutate(values);
        }
    };

    /* ------------------------------------------------------------------ */
    /* Selectable items                                                   */
    /* ------------------------------------------------------------------ */

    const selectableAuthorItems = useMemo<Author[]>(() => {
        if (isFolder(element)) return [];
        return [element.author];
    }, [element]);

    const selectableFolderItems = useMemo(() => {
        return element.parent ? [element.parent] : [];
    }, [element]);

    /* ------------------------------------------------------------------ */
    /* Render                                                             */
    /* ------------------------------------------------------------------ */

    return (
        <Dialog>
            <DialogTrigger asChild>{trigger}</DialogTrigger>

            <DialogContent>
                <DialogTitle className="border-b pb-2 text-3xl font-semibold">
                    Ordner oder Musiknote updaten
                </DialogTitle>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-8"
                    >
                        <FormField
                            control={form.control}
                            name="type"
                            render={() => (
                                <FormItem>
                                    <FormControl>
                                        <RadioGroup
                                            value={form.watch("type")}
                                            onValueChange={(value) => {
                                                if (value === "folder" || value === "note") {
                                                    form.setValue("type", value);
                                                }
                                            }}
                                            className="grid grid-cols-2"
                                        >
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="folder" />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                    Ordner
                                                </FormLabel>
                                            </FormItem>

                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="note" />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                    Musiknote
                                                </FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("title")}</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

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

                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="secondary">
                                    {t("cancel")}
                                </Button>
                            </DialogClose>

                            <Button type="submit">
                                {(updateFolderMutation.isPending ||
                                    updateNoteMutation.isPending) && (
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