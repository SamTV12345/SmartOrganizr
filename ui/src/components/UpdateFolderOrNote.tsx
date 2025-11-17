import { Button } from "@/components/ui/button"
import {
    Dialog, DialogClose,
    DialogContent, DialogFooter, DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {Check, ChevronsUpDown, Loader} from "lucide-react";
import {useTranslation} from "react-i18next";
import {z} from "zod";
import {FormProvider, useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import axios from "axios";
import {apiURL} from "@/src/Keycloak";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import { cn } from "./NavigationButton";
import {Page} from "@/src/models/Page";
import {FolderEmbeddedContainer} from "@/src/models/FolderEmbeddedContainer";
import {FolderItem, FolderPostDto} from "@/src/models/Folder";
import {replaceFolder, replaceNote} from "@/src/utils/ElementUtils";
import {NoteItem, NotePutDto} from "@/src/models/NoteItem";
import {AuthorEmbeddedContainer} from "@/src/models/AuthorEmbeddedContainer";
import {Author} from "@/src/models/Author";
import React, {useEffect, useMemo, useState} from "react";
import {ElementItem, isFolder, isNote} from "@/src/models/ElementItem";


export type UpdateFolderOrNoteProps = {
    element: ElementItem,
    trigger: React.ReactNode
    onDelete: (elementId: string)=>void
}



export function UpdateFolderOrNote(props: UpdateFolderOrNoteProps) {
    const {t} = useTranslation()
    const queryClient = useQueryClient()
    const [confirmDelete, setConfirmDelete] = useState(false);
    const deleteElement = async () => {
        const response = await axios.delete(apiURL + `/v1/elements/${props.element.id}`);
        return response.data;
    };
    const deleteMutation = useMutation<void, Error, void>({
        mutationFn: deleteElement,
        onSuccess: () => {
            props.onDelete(props.element.id);
        }
    });



    useEffect(() => {
        if (!confirmDelete) return;
        const timer = setTimeout(() => setConfirmDelete(false), 5000); // auto-cancel nach 5s
        return () => clearTimeout(timer);
    }, [confirmDelete]);

    const updateFolder = async(folder: FolderPostDto)=>{
        const response = await axios.patch(apiURL+`/v1/elements/folders/${props.element.id}`, folder)
        return response.data
    }

    const updateNote = async(note: NotePutDto)=>{
        const response = await axios.patch(apiURL+`/v1/elements/notes/${props.element.id}`, note)
        return response.data
    }

    const searchFolder = async(folderName: string)=>{
        const response = await axios.get(apiURL+`/v1/elements/folders`, {
            params: {
                folderName,
                page: 0
            }
        })
        return response.data
    }

    const searchAuthor = async(folderName: string)=>{
        const response = await axios.get(apiURL+`/v1/authors`, {
            params: {
                name: folderName,
                page: 0
            }
        })
        return response.data
    }

    const createFolderMutation = useMutation<FolderItem, Error, FolderPostDto>({
        mutationFn: updateFolder,
        onSuccess:(data)=>{
            queryClient.setQueryData(["folders"], (loadedNodes: ElementItem[])=>{
                return replaceFolder(data, loadedNodes)
            })
        }
    })

    const createNoteMutation = useMutation<NoteItem, Error, NotePutDto>({
        mutationFn: updateNote,
        onSuccess:(data)=>{
            queryClient.setQueryData(["folders"], (loadedNodes: ElementItem[])=>{
                return replaceNote(data, loadedNodes)
            })
        }
    })

    const searchAuthorsByName = useMutation<Page<AuthorEmbeddedContainer<Author>>, Error, string>({
        mutationFn: searchAuthor,
    })

    const searchFoldersByName = useMutation<Page<FolderEmbeddedContainer<FolderItem>>, Error, string>({
        mutationFn: searchFolder,
    })

    const folderSchema = z.object({
        name: z.string({required_error: t('fieldRequired')!}).min(1, {message: t('fieldRequired')!}),
        description: z.string().optional(),
        type: z.literal("folder"),
        parentId: z.string().optional(),
    })

    const noteSchema = z.object({
        type: z.literal("note"),
        name: z.string(),
        description: z.string({required_error: t('fieldRequired')!}).optional(),
        numberOfPages: z.coerce.number({required_error: t('fieldRequired')!}),
        authorId: z.string({required_error: t('fieldRequired')!}),
        parentId: z.string({required_error: t('fieldRequired')!}),
        extraInformation: z.string().optional(),
    })

    const schema = z.union([folderSchema, noteSchema]);

    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: props.element
    })
    function onSubmit(values: z.infer<typeof schema>) {
        console.log("Submit values are", values)
        if (props.element.type === 'folder') {
            createFolderMutation.mutate(values)
        } else if (props.element.type === 'note') {
            createNoteMutation.mutate(values as NotePutDto)
        }
    }
    const selectableFolderItems = useMemo(()=>{
        if (props.element.parent) {
            return [props.element.parent]
        } else {
            return searchFoldersByName.data?._embedded.elementRepresentationModelList || []
        }
    }, [searchFoldersByName])


    const selectableAuthorItems = useMemo(()=>{
        if (isFolder(props.element)) {
            return [] as Author[]
        } else {
           return [props.element.author, ...searchAuthorsByName.data?._embedded.authorRepresentationModelList || []]
        }
    }, [searchAuthorsByName])


    return (
        <Dialog>
            <DialogTrigger asChild>
                {props.trigger}
            </DialogTrigger>

            <DialogContent className="">
                <DialogTitle className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
                    Ordner oder Musiknote updaten
                </DialogTitle>


                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="type"
                            disabled
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormControl>
                                        <RadioGroup
                                            disabled
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
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
                                <FormItem className="grid-cols-2">
                                    <FormLabel>{t('title')}</FormLabel>
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
                                <FormItem className="grid-cols-2">
                                    <FormLabel>{t('description')}</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {
                            props.element.type === 'note' &&                         <FormField
                                control={form.control}
                                name="numberOfPages"
                                render={({ field }) => (
                                    <FormItem className="grid-cols-2">
                                        <FormLabel>{t('numberOfPages')}</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={0} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        }

                        {
                            props.element.type === 'note' &&                         <FormField
                                control={form.control}
                                name="extraInformation"
                                render={({ field }) => (
                                    <FormItem className="grid-cols-2">
                                        <FormLabel>{t('extraInformation')}</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        }

                        {props.element.type === 'note' && <FormField
                            control={form.control}
                            name="authorId"
                            render={({ field }) => (
                                <FormItem className="grid-cols-2">
                                    <FormLabel>Author</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className={cn(
                                                        "justify-between",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value
                                                        ? selectableAuthorItems.find(
                                                            (language) => language.id === field.value
                                                        )?.name
                                                        : "Ordner auswählen"}
                                                    <ChevronsUpDown className="opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[220px] p-0">
                                            <Command>
                                                <CommandInput
                                                    placeholder="Author suchen..."
                                                    className="h-9"
                                                    onValueChange={(e)=>{
                                                        searchAuthorsByName.mutate(e)
                                                    }}
                                                />
                                                <CommandList>
                                                    <CommandEmpty>No framework found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {selectableAuthorItems.map((language) => (
                                                            <CommandItem
                                                                value={language.name}
                                                                key={language.id}
                                                                onSelect={() => {
                                                                    form.setValue("authorId", language.id)
                                                                }}
                                                            >
                                                                {language.name}
                                                                <Check
                                                                    className={cn(
                                                                        "ml-auto",
                                                                        language.id === field.value
                                                                            ? "opacity-100"
                                                                            : "opacity-0"
                                                                    )}
                                                                />
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>)}/>}

                        <FormField
                            control={form.control}
                            name="parentId"
                            render={({ field }) => (
                                <FormItem className="grid-cols-2">
                                    <FormLabel>Ordner</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className={cn(
                                                        "justify-between",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value
                                                        ? selectableFolderItems.find(
                                                            (language) => language.id === field.value
                                                        )?.name
                                                        : "Ordner auswählen"}
                                                    <ChevronsUpDown className="opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[220px] p-0">
                                            <Command>
                                                <CommandInput
                                                    placeholder="Search framework..."
                                                    className="h-9"
                                                    onValueChange={(e)=>{
                                                        searchFoldersByName.mutate(e)
                                                    }}
                                                />
                                                <CommandList>
                                                    <CommandEmpty>No framework found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {selectableFolderItems.map((language) => (
                                                            <CommandItem
                                                                value={language.name}
                                                                key={language.id}
                                                                onSelect={() => {
                                                                    form.setValue("parentId", language.id)
                                                                }}
                                                            >
                                                                {language.name}
                                                                <Check
                                                                    className={cn(
                                                                        "ml-auto",
                                                                        language.id === field.value
                                                                            ? "opacity-100"
                                                                            : "opacity-0"
                                                                    )}
                                                                />
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>)}/>
                        <DialogFooter>
                            <DialogClose>
                                <Button type="button" variant="secondary" >{t('cancel')}</Button>
                            </DialogClose>
                            {!confirmDelete ? (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setConfirmDelete(true)}
                                >
                                    <i className="fa-solid fa-trash text-red-600"></i>
                                </Button>
                            ) : (
                                <div className="flex items-center space-x-2">
                                    <DialogClose>
                                        <Button
                                            type="button"
                                            className="bg-red-600 text-white hover:bg-red-700"
                                            onClick={() => deleteMutation.mutate()}
                                        >
                                            {deleteMutation.isPending ? <Loader className="animate-spin" /> : t('confirm')}
                                        </Button>
                                    </DialogClose>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setConfirmDelete(false)}
                                    >
                                        {t('cancel')}
                                    </Button>
                                </div>
                            )}
                            <Button type="submit" >{
                                (createFolderMutation.isPending || createNoteMutation.isPending) ? <Loader className="animate-spin"/>:
                                    t('save')
                            }</Button>
                        </DialogFooter>
                    </form>
                </FormProvider>
            </DialogContent>
        </Dialog>

    )
}
